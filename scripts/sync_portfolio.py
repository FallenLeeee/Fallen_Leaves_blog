"""Sync portfolio from GitHub: fetch READMEs, rebuild projects-data.js."""
import base64
import json
import subprocess
from pathlib import Path

USERNAME = "FallenLeeee"
ROOT = Path(__file__).resolve().parent.parent
MD_DIR = ROOT / "md"

# Display order + card metadata (title/desc curated for the site)
PROJECTS = [
    {
        "name": "MiBudsController",
        "title": "MiBudsController",
        "desc": "通过蓝牙 RFCOMM 控制 Redmi Buds 8 Pro 及协议兼容的小米/红米耳机的 Windows 桌面应用。",
    },
    {
        "name": "NPURealtimeSubtitle",
        "title": "NPURealtimeSubtitle",
        "desc": "Windows 11 本地实时双语字幕工具：采集系统声音，本地识别与翻译，屏幕底部透明字幕。",
    },
    {
        "name": "PassiveMapRecorder",
        "title": "PassiveMapRecorder",
        "desc": "一个纯客户端的 Fabric 模组，被动记录玩家已加载区块的地形数据，直接写入存档文件。",
    },
    {
        "name": "UnlockVirtualization",
        "title": "CPU 虚拟化解锁工具",
        "desc": "检测并管理占用 CPU 虚拟化的应用程序和服务。",
    },
]


def gh_api(path: str) -> dict:
    result = subprocess.run(
        ["gh", "api", path],
        capture_output=True,
        check=True,
    )
    return json.loads(result.stdout.decode("utf-8"))


def fetch_readme(repo_name: str) -> str:
    data = gh_api(f"repos/{USERNAME}/{repo_name}/readme")
    return base64.b64decode(data["content"]).decode("utf-8")


def js_string(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def main() -> None:
    MD_DIR.mkdir(exist_ok=True)
    entries = []

    for item in PROJECTS:
        name = item["name"]
        print(f"Syncing {name} ...")
        readme = fetch_readme(name)
        md_path = MD_DIR / f"{name}.md"
        old = md_path.read_text(encoding="utf-8") if md_path.exists() else ""
        if old != readme:
            md_path.write_text(readme, encoding="utf-8", newline="\n")
            print(f"  README updated ({len(old)} -> {len(readme)} chars)")
        else:
            print("  README unchanged")

        entries.append(
            "  {\n"
            f'    file: {js_string(f"{name}.md")},\n'
            f"    title: {js_string(item['title'])},\n"
            f"    desc: {js_string(item['desc'])},\n"
            f'    gh: {js_string(f"https://github.com/{USERNAME}/{name}")},\n'
            f"    md: {js_string(readme)}\n"
            "  }"
        )

    out = "window.__projects = [\n" + ",\n".join(entries) + "\n];\n"
    (ROOT / "projects-data.js").write_text(out, encoding="utf-8", newline="\n")
    (MD_DIR / "manifest.json").write_text(
        json.dumps([p["name"] + ".md" for p in PROJECTS], ensure_ascii=False) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    print("Wrote projects-data.js and md/manifest.json")


if __name__ == "__main__":
    main()
