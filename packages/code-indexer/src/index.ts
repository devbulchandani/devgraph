import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";
import fg from "fast-glob";
import { CodeEntity, APIContract } from "@devgraph/shared";
import { DevGraphDatabase } from "@devgraph/graph";

export interface IndexerOptions {
  projectId: string;
  repositoryId: string;
  repoRoot: string;
  includePatterns?: string[];
  excludePatterns?: string[];
  commitHash?: string;
}

export interface IndexResult {
  indexedFiles: number;
  functionsCount: number;
  classesCount: number;
  interfacesCount: number;
  importsCount: number;
  callsCount: number;
  contractsCount: number;
  testFilesCount: number;
  errors: Array<{ file: string; error: string }>;
  durationMs: number;
}

export class CodeIndexer {
  private db: DevGraphDatabase;

  constructor(db: DevGraphDatabase) {
    this.db = db;
  }

  public async indexRepository(options: IndexerOptions): Promise<IndexResult> {
    const startTime = Date.now();
    const {
      projectId,
      repositoryId,
      repoRoot,
      includePatterns = ["**/*.{ts,tsx,js,jsx}"],
      excludePatterns = [
        "**/node_modules/**",
        "**/dist/**",
        "**/build/**",
        "**/.git/**",
        "**/.turbo/**",
        "**/coverage/**",
        "**/*.d.ts",
      ],
      commitHash = "HEAD",
    } = options;

    const errors: Array<{ file: string; error: string }> = [];
    let functionsCount = 0;
    let classesCount = 0;
    let interfacesCount = 0;
    let importsCount = 0;
    let callsCount = 0;
    let contractsCount = 0;
    let testFilesCount = 0;

    // 1. Discover files
    const files = await fg(includePatterns, {
      cwd: repoRoot,
      ignore: excludePatterns,
      onlyFiles: true,
      dot: false,
    });

    // 2. Process each file
    const fileEntities: CodeEntity[] = [];
    const symbolEntities: CodeEntity[] = [];
    const importEdges: Array<{ from: string; to: string }> = [];
    const callEdges: Array<{ fromSymbolId: string; toSymbolId: string }> = [];
    const contracts: APIContract[] = [];

    for (const relativePath of files) {
      const fullPath = path.join(repoRoot, relativePath);
      const isTestFile =
        /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(relativePath) ||
        relativePath.includes("__tests__");

      if (isTestFile) {
        testFilesCount++;
      }

      const fileEntity: CodeEntity = {
        id: `${projectId}:${relativePath}`,
        projectId,
        repositoryId,
        filePath: relativePath,
        entityType: "file",
        lastIndexedRevision: commitHash,
        exported: false,
      };
      fileEntities.push(fileEntity);

      try {
        const sourceCode = fs.readFileSync(fullPath, "utf-8");
        const sourceFile = ts.createSourceFile(
          relativePath,
          sourceCode,
          ts.ScriptTarget.Latest,
          true
        );

        // Parse AST
        const parsed = this.parseSourceFile(
          sourceFile,
          relativePath,
          projectId,
          repositoryId
        );

        functionsCount += parsed.functions.length;
        classesCount += parsed.classes.length;
        interfacesCount += parsed.interfaces.length;
        importsCount += parsed.imports.length;
        callsCount += parsed.calls.length;
        contractsCount += parsed.contracts.length;

        symbolEntities.push(
          ...parsed.functions,
          ...parsed.classes,
          ...parsed.interfaces
        );

        contracts.push(...parsed.contracts);

        for (const imp of parsed.imports) {
          // Resolve relative import to relative file path if local
          const resolvedPath = this.resolveImportPath(
            repoRoot,
            relativePath,
            imp
          );
          if (resolvedPath) {
            importEdges.push({ from: relativePath, to: resolvedPath });
          }
        }
      } catch (err: any) {
        errors.push({ file: relativePath, error: err.message });
      }
    }

    // 3. Batch persist into FalkorDB
    // Upsert project and repo
    await this.db.upsertProject(
      projectId,
      path.basename(repoRoot),
      repoRoot
    );
    await this.db.upsertRepository(repositoryId, projectId, repositoryId);

    // Upsert files
    for (const file of fileEntities) {
      await this.db.upsertFile(file, commitHash);
    }

    // Upsert symbols
    for (const symbol of symbolEntities) {
      await this.db.upsertSymbol(symbol);
    }

    // Upsert API contracts
    for (const contract of contracts) {
      await this.db.upsertAPIContract(contract);
    }

    // Create import edges
    for (const edge of importEdges) {
      await this.db.createImportEdge(projectId, edge.from, edge.to);
    }

    const durationMs = Date.now() - startTime;

    return {
      indexedFiles: fileEntities.length,
      functionsCount,
      classesCount,
      interfacesCount,
      importsCount,
      callsCount,
      contractsCount,
      testFilesCount,
      errors,
      durationMs,
    };
  }

  private parseSourceFile(
    sourceFile: ts.SourceFile,
    relativePath: string,
    projectId: string,
    repositoryId: string
  ): {
    functions: CodeEntity[];
    classes: CodeEntity[];
    interfaces: CodeEntity[];
    imports: string[];
    calls: Array<{ caller: string; callee: string }>;
    contracts: APIContract[];
  } {
    const functions: CodeEntity[] = [];
    const classes: CodeEntity[] = [];
    const interfaces: CodeEntity[] = [];
    const imports: string[] = [];
    const calls: Array<{ caller: string; callee: string }> = [];
    const contracts: APIContract[] = [];

    const getLineAndChar = (pos: number) => {
      const { line } = sourceFile.getLineAndCharacterOfPosition(pos);
      return line + 1; // 1-indexed
    };

    const isExported = (node: ts.Node): boolean => {
      const modifiers = ts.canHaveModifiers(node)
        ? ts.getModifiers(node)
        : undefined;
      if (!modifiers) return false;
      return modifiers.some(
        (m: ts.ModifierLike) => m.kind === ts.SyntaxKind.ExportKeyword
      );
    };

    const visit = (node: ts.Node) => {
      // 1. Imports
      if (ts.isImportDeclaration(node)) {
        if (
          node.moduleSpecifier &&
          ts.isStringLiteral(node.moduleSpecifier)
        ) {
          imports.push(node.moduleSpecifier.text);
        }
      }

      // 2. Functions (FunctionDeclaration)
      else if (ts.isFunctionDeclaration(node)) {
        const name = node.name ? node.name.text : "anonymous";
        const startLine = getLineAndChar(node.getStart());
        const endLine = getLineAndChar(node.getEnd());
        const exported = isExported(node);

        functions.push({
          id: `${projectId}:${relativePath}#fn:${name}`,
          projectId,
          repositoryId,
          filePath: relativePath,
          symbolName: name,
          entityType: "function",
          startLine,
          endLine,
          exported,
        });
      }

      // 3. Arrow functions or function expressions assigned to const/let
      else if (ts.isVariableStatement(node)) {
        const exported = isExported(node);
        for (const decl of node.declarationList.declarations) {
          if (
            decl.name &&
            ts.isIdentifier(decl.name) &&
            decl.initializer &&
            (ts.isArrowFunction(decl.initializer) ||
              ts.isFunctionExpression(decl.initializer))
          ) {
            const name = decl.name.text;
            const startLine = getLineAndChar(node.getStart());
            const endLine = getLineAndChar(node.getEnd());

            functions.push({
              id: `${projectId}:${relativePath}#fn:${name}`,
              projectId,
              repositoryId,
              filePath: relativePath,
              symbolName: name,
              entityType: "function",
              startLine,
              endLine,
              exported,
            });
          }
        }
      }

      // 4. Classes
      else if (ts.isClassDeclaration(node)) {
        const name = node.name ? node.name.text : "AnonymousClass";
        const startLine = getLineAndChar(node.getStart());
        const endLine = getLineAndChar(node.getEnd());
        const exported = isExported(node);

        classes.push({
          id: `${projectId}:${relativePath}#class:${name}`,
          projectId,
          repositoryId,
          filePath: relativePath,
          symbolName: name,
          entityType: "class",
          startLine,
          endLine,
          exported,
        });
      }

      // 5. Interfaces and Type Aliases (API Contracts / Schemas)
      else if (ts.isInterfaceDeclaration(node)) {
        const name = node.name.text;
        const startLine = getLineAndChar(node.getStart());
        const endLine = getLineAndChar(node.getEnd());
        const exported = isExported(node);
        const schemaDefinition = node.getText(sourceFile);

        interfaces.push({
          id: `${projectId}:${relativePath}#interface:${name}`,
          projectId,
          repositoryId,
          filePath: relativePath,
          symbolName: name,
          entityType: "interface",
          startLine,
          endLine,
          exported,
        });

        // If exported or clearly a shared schema/DTO, treat as APIContract
        if (
          exported ||
          name.endsWith("Response") ||
          name.endsWith("Request") ||
          name.endsWith("DTO") ||
          name.endsWith("Contract") ||
          name.endsWith("Payload")
        ) {
          contracts.push({
            contractId: `${projectId}:${name}`,
            projectId,
            name,
            filePath: relativePath,
            symbol: name,
            schemaDefinition,
            version: "1.0.0",
            lastUpdated: new Date().toISOString(),
          });
        }
      } else if (ts.isTypeAliasDeclaration(node)) {
        const name = node.name.text;
        const startLine = getLineAndChar(node.getStart());
        const endLine = getLineAndChar(node.getEnd());
        const exported = isExported(node);
        const schemaDefinition = node.getText(sourceFile);

        interfaces.push({
          id: `${projectId}:${relativePath}#type:${name}`,
          projectId,
          repositoryId,
          filePath: relativePath,
          symbolName: name,
          entityType: "type_alias",
          startLine,
          endLine,
          exported,
        });

        if (
          exported ||
          name.endsWith("Response") ||
          name.endsWith("Request") ||
          name.endsWith("DTO") ||
          name.endsWith("Contract")
        ) {
          contracts.push({
            contractId: `${projectId}:${name}`,
            projectId,
            name,
            filePath: relativePath,
            symbol: name,
            schemaDefinition,
            version: "1.0.0",
            lastUpdated: new Date().toISOString(),
          });
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    return {
      functions,
      classes,
      interfaces,
      imports,
      calls,
      contracts,
    };
  }

  private resolveImportPath(
    repoRoot: string,
    currentFilePath: string,
    importSpecifier: string
  ): string | null {
    if (!importSpecifier.startsWith(".")) {
      return null; // External package, not a local file
    }

    const currentDir = path.dirname(path.join(repoRoot, currentFilePath));
    const targetBase = path.resolve(currentDir, importSpecifier);
    const targetWithoutExt = targetBase.replace(/\.(js|jsx)$/, "");

    // Candidates
    const candidates = [
      targetBase,
      `${targetBase}.ts`,
      `${targetBase}.tsx`,
      `${targetBase}.js`,
      `${targetBase}.jsx`,
      `${targetWithoutExt}.ts`,
      `${targetWithoutExt}.tsx`,
      `${targetWithoutExt}.js`,
      path.join(targetBase, "index.ts"),
      path.join(targetBase, "index.tsx"),
      path.join(targetBase, "index.js"),
      path.join(targetWithoutExt, "index.ts"),
      path.join(targetWithoutExt, "index.tsx"),
    ];

    for (const cand of candidates) {
      if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
        return path.relative(repoRoot, cand);
      }
    }

    return null;
  }
}
