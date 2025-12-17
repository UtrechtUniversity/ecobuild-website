import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

// Define allowed collections
const ALLOWED_COLLECTIONS = [
    "publications",
    "presentations",
    "partners",
    "team",
    "softwares",
    "activities",
];

export async function getSearchIndex() {
    const contentRoot = fileURLToPath(new URL("../content/", import.meta.url));
    const rawEntries: any[] = [];

    // Use import.meta.env.BASE_URL which comes from astro.config.mjs
    // Remove trailing slash to avoid double slashes when joining
    const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, "");

    async function walkDir(dirPath: string) {
        let dirents;
        try {
            dirents = await fs.readdir(dirPath, { withFileTypes: true });
        } catch (e) {
            return;
        }

        for (const dirent of dirents) {
            const childPath = path.join(dirPath, dirent.name);
            if (dirent.isDirectory()) {
                await walkDir(childPath);
            } else if (dirent.isFile() && /\.mdx?$/.test(dirent.name)) {
                try {
                    const raw = await fs.readFile(childPath, "utf-8");
                    const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
                    const fm = fmMatch ? fmMatch[1] : "";
                    const getField = (name: string) => {
                        const re = new RegExp(
                            name + ":\\s*(?:'([^']*)'|\"([^\"]*)\"|([^\\n]+))",
                        );
                        const m = fm.match(re);
                        if (!m) return "";
                        return (m[1] || m[2] || m[3] || "").trim();
                    };
                    const title = getField("title") || getField("name") || "";
                    const bio = getField("bio") || "";
                    const description = getField("description") || "";
                    const name = getField("name") || "";
                    const role = getField("role") || "";
                    const authors = getField("authors") || "";
                    const webpage =
                        getField("website") || getField("url") || getField("link") || "";
                    const body = raw
                        .replace(/^---[\s\S]*?---\r?\n?/, "")
                        .replace(/\r?\n/g, " ");

                    // Determine collection name from path relative to src/content
                    const idx = childPath.indexOf(path.join("src", "content"));
                    let url = "";

                    if (idx !== -1) {
                        const rel = childPath.slice(idx + path.join("src", "content").length);
                        const parts = rel.split(path.sep).filter((p) => p); // Remove empty strings
                        const collection = parts[0];
                        const slug = rel.replace(/\\/g, "/").replace(/\.mdx?$/, "");

                        if (collection === "presentations") {
                            url = `${BASE_PATH}/publications#presentations`;
                        } else if (collection === "publications") {
                            const type = getField("type");
                            if (
                                type &&
                                (type.includes("newspaper") || type.includes("Newspaper"))
                            ) {
                                url = `${BASE_PATH}/publications#newspapers`;
                            } else {
                                url = `${BASE_PATH}/publications#papers`;
                            }
                        } else if (collection === "softwares") {
                            url = `${BASE_PATH}/publications#softwares`;
                        } else if (collection === "activities") {
                            url = `${BASE_PATH}${slug}`;
                        } else {
                            url = `${BASE_PATH}${slug}`;
                        }
                    } else {
                        url = `${BASE_PATH}/${dirent.name.replace(/\.mdx?$/, "")}`;
                    }

                    rawEntries.push({
                        title,
                        bio,
                        description,
                        name,
                        role,
                        authors,
                        webpage,
                        content: body,
                        url,
                    });
                } catch (e) {
                    console.error("Failed to read file", childPath, e);
                }
            }
        }
    }

    for (const collection of ALLOWED_COLLECTIONS) {
        await walkDir(path.join(contentRoot, collection));
    }

    return rawEntries;
}
