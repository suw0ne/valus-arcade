"""밸루스 아케이드 글로벌 포털 제출용 자동 QA 검증기 (qa_submission_check.py).

CrazyGames · Poki · itch.io · 자체 PWA 배포 전 모든 라이브 게임을 자동 전수 검증한다:
1) 모든 JS 파일 구문 검사 (`node --check`)
2) 외부 CDN / 무단 데이터 API 호출 0건 검사 (`Zero-API` 원칙)
3) CrazyGames / Poki SDK 훅, 모바일 viewport 메타, Web Audio 언락 코드 존재 확인
4) `dist/<slug>-crazygames.zip` 및 `dist/<slug>-poki.zip` 무결성(`testzip`), 용량 상한, SDK 주입 및 참조 에셋 누락 검사
5) 1280x720 커버 아트 검증 + `rules.py` 보안·정치중립·개인정보(PII 0%) 전수 통과 검증
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
import zipfile
from datetime import datetime, timezone, timedelta
from pathlib import Path
from PIL import Image

PORTAL_DIR = Path(__file__).resolve().parent
HQ_DIR = PORTAL_DIR.parent
GAMES_SRC_DIR = HQ_DIR / "games"
ROOT_DIR = HQ_DIR.parent

sys.path.insert(0, str(ROOT_DIR / "sns-auto-factory"))
from config.rules import validate_content  # noqa: E402

VENDOR_JS_NAMES = {"three.min.js", "RoomEnvironment.js"}
MAX_ZIP_BYTES = 10 * 1024 * 1024  # 10 MB 상한 (CrazyGames/Poki 초기 번들 권장 기준 대비 여유)
ALLOWED_EXTERNAL_URLS = {
    "http://www.w3.org/2000/svg",
    "https://www.w3.org/2000/svg",
}
URL_RE = re.compile(r"https?://[^\s'\"`<>)]+", re.IGNORECASE)
LOCAL_ASSET_RE = re.compile(r"""(?:src|href)\s*=\s*["']([^"']+)["']""", re.IGNORECASE)
LOCAL_PATH_LEAK_RE = re.compile(r"(?:[A-Za-z]:\\Users\\|/Users/[A-Za-z0-9_.-]+/)")


def check_node_syntax(js_path: Path) -> tuple[bool, str]:
    proc = subprocess.run(
        ["node", "--check", str(js_path)],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if proc.returncode != 0:
        err = (proc.stderr or proc.stdout or "syntax error").strip().splitlines()
        return False, err[0] if err else "syntax error"
    return True, "ok"


def audit_game(game: dict) -> dict:
    slug = game["slug"]
    src_dir = GAMES_SRC_DIR / slug
    errors: list[str] = []
    details: dict = {
        "slug": slug,
        "version": game.get("version", ""),
        "js_checked": 0,
        "zip_sizes": {},
    }

    if not src_dir.exists():
        errors.append(f"원본 게임 폴더 누락: {src_dir}")
        return {"slug": slug, "passed": False, "errors": errors, "details": details}

    index_file = src_dir / "index.html"
    if not index_file.exists():
        errors.append("index.html 누락")
        return {"slug": slug, "passed": False, "errors": errors, "details": details}

    index_text = index_file.read_text(encoding="utf-8")

    # 1. 모바일 뷰포트 & PORTAL_SDK_SLOT 존재 확인
    if 'name="viewport"' not in index_text and "name='viewport'" not in index_text:
        errors.append("index.html에 모바일 viewport 메타 태그 누락")
    if "<!-- PORTAL_SDK_SLOT -->" not in index_text:
        errors.append("index.html에 <!-- PORTAL_SDK_SLOT --> 플레이스홀더 누락")

    # 2. JS 구문 검사 + SDK 훅 + Web Audio + 외부 URL 0건 + rules.py + PII 검사
    js_files = sorted(src_dir.rglob("*.js"))
    css_files = sorted(src_dir.rglob("*.css"))
    html_files = sorted(src_dir.rglob("*.html"))

    authored_js_blob = []
    for jf in js_files:
        ok, msg = check_node_syntax(jf)
        details["js_checked"] += 1
        if not ok:
            errors.append(f"JS 구문 오류 ({jf.name}): {msg}")
        if jf.name not in VENDOR_JS_NAMES:
            authored_js_blob.append(jf.read_text(encoding="utf-8"))

    joined_js = "\n".join(authored_js_blob)
    if "CrazyGames" not in joined_js:
        errors.append("CrazyGames SDK 연동 훅 누락")
    if "PokiSDK" not in joined_js:
        errors.append("PokiSDK 연동 훅 누락")
    if "AudioContext" not in joined_js and "webkitAudioContext" not in joined_js:
        errors.append("Web Audio API(AudioContext) 언락 코드 누락")

    # 외부 URL 및 rules.py / 로컬 경로 누출 검증 (벤더 라이브러리 제외)
    authored_files = html_files + css_files + [jf for jf in js_files if jf.name not in VENDOR_JS_NAMES]
    for f in authored_files:
        text = f.read_text(encoding="utf-8")
        urls = [u for u in URL_RE.findall(text) if u not in ALLOWED_EXTERNAL_URLS]
        if urls:
            errors.append(f"외부 URL 감지 ({f.name}): {urls[0]}")
        if LOCAL_PATH_LEAK_RE.search(text):
            errors.append(f"로컬 사용자 경로 누출 감지 ({f.name})")
        ok_rule, reason = validate_content(text, max_length=0)
        if not ok_rule:
            errors.append(f"rules.py 검증 실패 ({f.name}): {reason}")

    # 3. CrazyGames & Poki ZIP 번들 무결성·용량·주입·에셋 참조 검사
    expected_markers = {
        "crazygames": "sdk.crazygames.com/crazygames-sdk-v2.js",
        "poki": "game-cdn.poki.com/scripts/v2/poki-sdk.js",
    }
    dist_dir = src_dir / "dist"
    for portal, sdk_marker in expected_markers.items():
        zpath = dist_dir / f"{slug}-{portal}.zip"
        if not zpath.exists():
            errors.append(f"{portal} ZIP 누락: {zpath.name}")
            continue
        zsize = zpath.stat().st_size
        details["zip_sizes"][portal] = zsize
        if zsize > MAX_ZIP_BYTES:
            errors.append(f"{portal} ZIP 용량 초과 ({zsize:,} bytes > {MAX_ZIP_BYTES:,})")
        try:
            with zipfile.ZipFile(zpath, "r") as zf:
                bad = zf.testzip()
                if bad is not None:
                    errors.append(f"{portal} ZIP 손상 파일: {bad}")
                names = set(zf.namelist())
                if "index.html" not in names:
                    errors.append(f"{portal} ZIP 내부 index.html 누락")
                    continue
                zip_index = zf.read("index.html").decode("utf-8", errors="replace")
                if sdk_marker not in zip_index:
                    errors.append(f"{portal} ZIP에 공식 SDK 스크립트 미주입")
                if "<!-- PORTAL_SDK_SLOT -->" in zip_index:
                    errors.append(f"{portal} ZIP에 미치환 PORTAL_SDK_SLOT 잔존")
                # index.html이 참조하는 로컬 css/js 자산이 ZIP 내부에 모두 존재하는지 검증
                for ref in LOCAL_ASSET_RE.findall(zip_index):
                    if ref.startswith(("http://", "https://", "data:", "#", "mailto:")):
                        continue
                    clean_ref = ref.split("?")[0].lstrip("./")
                    if clean_ref not in names:
                        errors.append(f"{portal} ZIP 내부 참조 자산 누락: {clean_ref}")
        except zipfile.BadZipFile:
            errors.append(f"{portal} ZIP 포맷 손상")

    # 4. 커버 이미지(1280x720) 검증
    cover_rel = game.get("cover", "")
    cover_path = PORTAL_DIR / cover_rel
    if not cover_path.exists():
        errors.append(f"커버 이미지 누락: {cover_rel}")
    else:
        try:
            with Image.open(cover_path) as im:
                w, h = im.size
                details["cover_size"] = f"{w}x{h}"
                if (w, h) != (1280, 720):
                    errors.append(f"커버 해상도 불일치 ({w}x{h} != 1280x720)")
        except Exception as exc:
            errors.append(f"커버 이미지 열기 실패: {exc}")

    return {
        "slug": slug,
        "passed": len(errors) == 0,
        "errors": errors,
        "details": details,
    }


def main() -> int:
    catalog_path = PORTAL_DIR / "data" / "games.json"
    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    live_games = [g for g in catalog.get("games", []) if g.get("status") == "live"]

    results = [audit_game(g) for g in live_games]
    passed_count = sum(1 for r in results if r["passed"])
    total_count = len(results)

    kst = timezone(timedelta(hours=9))
    report = {
        "checked_at_kst": datetime.now(kst).strftime("%Y-%m-%d %H:%M:%S KST"),
        "total_live_games": total_count,
        "passed_games": passed_count,
        "all_pass": passed_count == total_count and total_count > 0,
        "results": results,
    }
    report_path = PORTAL_DIR / "qa_submission_report.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print("=" * 72)
    print(f"VALUS ARCADE 글로벌 포털 제출 QA 결과: {passed_count}/{total_count} PASS")
    print("=" * 72)
    for r in results:
        status = "PASS" if r["passed"] else "FAIL"
        d = r["details"]
        cg_kb = d.get("zip_sizes", {}).get("crazygames", 0) / 1024
        pk_kb = d.get("zip_sizes", {}).get("poki", 0) / 1024
        print(
            f"[{status}] {r['slug']:<18} v{d.get('version',''):<6} | "
            f"JS:{d.get('js_checked',0):<2} | CG:{cg_kb:6.1f}KB | Poki:{pk_kb:6.1f}KB | "
            f"Cover:{d.get('cover_size','-')}"
        )
        for err in r["errors"]:
            print(f"       -> ERROR: {err}")
    print("=" * 72)
    print(f"리포트 저장: {report_path}")

    return 0 if report["all_pass"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
