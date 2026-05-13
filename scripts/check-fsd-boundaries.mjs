import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, normalize, relative, resolve } from "node:path";

const root = process.cwd();
const appAdapterRoot = join(root, "app");
const sourceRoot = join(root, "src");
const sourceExtensions = new Set([".ts", ".tsx", ".mts", ".mjs", ".js", ".jsx"]);
const layerRanks = {
  app: 0,
  "app-adapter": 0,
  pages: 1,
  widgets: 2,
  features: 3,
  entities: 4,
  shared: 5,
};

const aliasTargets = [
  ["@/app/", "src/app/"],
  ["@/pages/", "src/pages/"],
  ["@/widgets/", "src/widgets/"],
  ["@/features/", "src/features/"],
  ["@/entities/", "src/entities/"],
  ["@/shared/", "src/shared/"],
  ["@/", "src/"],
];

const files = [appAdapterRoot, sourceRoot]
  .filter((directory) => existsSync(directory))
  .flatMap((directory) => listFiles(directory))
  .filter((file) => sourceExtensions.has(extname(file)));
const violations = [];

for (const file of files) {
  const sourceElement = getElement(file);
  const imports = getImportSpecifiers(readFileSync(file, "utf8"));

  for (const specifier of imports) {
    const targetFile = resolveImport(file, specifier);

    if (!targetFile) {
      continue;
    }

    const targetElement = getElement(targetFile);

    if (!sourceElement || !targetElement) {
      continue;
    }

    checkDirection(file, sourceElement, specifier, targetElement);
    checkSameLayerSlices(file, sourceElement, specifier, targetElement);
    checkPublicApi(file, sourceElement, specifier, targetElement);
  }
}

if (violations.length > 0) {
  console.error("FSD boundary violations:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log("FSD boundary check passed: 0 violations");

function listFiles(directory) {
  const entries = readdirSync(directory);
  const result = [];

  for (const entry of entries) {
    const fullPath = join(directory, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      result.push(...listFiles(fullPath));
    } else if (stats.isFile()) {
      result.push(fullPath);
    }
  }

  return result;
}

function getImportSpecifiers(source) {
  const specifiers = [];
  const patterns = [
    /\bimport\s+(?:type\s+)?(?:[^"']+?\s+from\s+)?["']([^"']+)["']/g,
    /\bexport\s+(?:type\s+)?[^"']+?\s+from\s+["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];

  for (const pattern of patterns) {
    let match = pattern.exec(source);
    while (match) {
      specifiers.push(match[1]);
      match = pattern.exec(source);
    }
  }

  return specifiers;
}

function resolveImport(fromFile, specifier) {
  if (specifier.startsWith(".")) {
    return resolveExistingPath(resolve(dirname(fromFile), specifier));
  }

  for (const [alias, target] of aliasTargets) {
    if (specifier.startsWith(alias)) {
      return resolveExistingPath(join(root, target, specifier.slice(alias.length)));
    }
  }

  return null;
}

function resolveExistingPath(pathWithoutExtension) {
  const candidates = [
    pathWithoutExtension,
    ...Array.from(sourceExtensions, (extension) => `${pathWithoutExtension}${extension}`),
    ...Array.from(sourceExtensions, (extension) =>
      join(pathWithoutExtension, `index${extension}`),
    ),
  ];

  return candidates.find((candidate) => existsSync(candidate)) ?? pathWithoutExtension;
}

function getElement(file) {
  const relativePath = toPosix(relative(root, file));
  const parts = relativePath.split("/");

  if (relativePath.startsWith("app/")) {
    return { layer: "app-adapter", slice: null, path: relativePath };
  }

  if (relativePath.startsWith("src/app/")) {
    return { layer: "app", slice: null, path: relativePath };
  }

  if (relativePath.startsWith("src/pages/")) {
    return { layer: "pages", slice: parts[2] ?? null, path: relativePath };
  }

  if (relativePath.startsWith("src/widgets/")) {
    return { layer: "widgets", slice: parts[2] ?? null, path: relativePath };
  }

  if (relativePath.startsWith("src/features/")) {
    return { layer: "features", slice: parts[2] ?? null, path: relativePath };
  }

  if (relativePath.startsWith("src/entities/")) {
    return { layer: "entities", slice: parts[2] ?? null, path: relativePath };
  }

  if (relativePath.startsWith("src/shared/")) {
    return { layer: "shared", slice: null, path: relativePath };
  }

  return null;
}

function checkDirection(file, source, specifier, target) {
  const sourceRank = layerRanks[source.layer];
  const targetRank = layerRanks[target.layer];

  if (sourceRank === undefined || targetRank === undefined) {
    return;
  }

  if (targetRank < sourceRank) {
    addViolation(
      file,
      `${source.layer} cannot import upper layer ${target.layer} via "${specifier}"`,
    );
  }
}

function checkSameLayerSlices(file, source, specifier, target) {
  if (source.layer !== target.layer) {
    return;
  }

  if (!source.slice || !target.slice || source.slice === target.slice) {
    return;
  }

  if (
    source.layer === "entities" &&
    specifier.includes(`/@x/${source.slice}`)
  ) {
    return;
  }

  addViolation(
    file,
    `${source.layer}/${source.slice} cannot import same-layer slice ${target.slice} via "${specifier}"`,
  );
}

function checkPublicApi(file, source, specifier, target) {
  if (!specifier.startsWith("@/")) {
    return;
  }

  if (!target.slice || source.path.startsWith(`src/${target.layer}/${target.slice}/`)) {
    return;
  }

  const aliasLayer = target.layer === "pages" ? "pages" : target.layer;
  const expectedRoot =
    target.layer === "app" ? "@/app" : `@/${aliasLayer}/${target.slice}`;

  if (target.layer === "shared" || target.layer === "app-adapter") {
    return;
  }

  if (specifier !== expectedRoot) {
    addViolation(
      file,
      `external import of ${target.layer}/${target.slice} must use public API "${expectedRoot}", got "${specifier}"`,
    );
  }
}

function addViolation(file, message) {
  violations.push(`${toPosix(relative(root, file))}: ${message}`);
}

function toPosix(path) {
  return normalize(path).replaceAll("\\", "/");
}
