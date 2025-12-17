import { getSearchIndex } from "../utils/search";

export async function GET() {
    const index = await getSearchIndex();
    return new Response(JSON.stringify(index), {
        headers: {
            "Content-Type": "application/json",
        },
    });
}
