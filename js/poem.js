const POEM_API = "https://v1.jinrishici.com/all.json";

async function fetchPoem() {
  try {
    const res = await fetch(POEM_API);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      content: data.content,
      origin: `${data.origin || ""}${data.author ? " · " + data.author : ""}`
    };
  } catch (err) {
    console.warn("诗词API请求失败:", err.message);
    return {
      content: "行到水穷处，坐看云起时。",
      origin: "王维 · 终南别业"
    };
  }
}
