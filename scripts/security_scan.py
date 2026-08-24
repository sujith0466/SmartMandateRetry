"""Comprehensive Git and Repository Security Scanner."""

import os
import re
import subprocess
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent

# Sensitive regex patterns to detect real secrets
SECRET_PATTERNS = [
    (r"sk-or-v1-[a-f0-9]{64}", "OpenRouter Live API Key"),
    (r"sk-[a-zA-Z0-9]{32,}", "Generic Secret Key / OpenAI Key"),
    (r"rzp_live_[a-zA-Z0-9]{14,}", "Razorpay Live Key ID"),
    (r"rzp_test_[a-zA-Z0-9]{14,}", "Razorpay Test Key ID (actual key)"),
    (r"-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----", "Private Key Header"),
    (r"AKIA[0-9A-Z]{16}", "AWS Access Key ID"),
    (r"ghp_[a-zA-Z0-9]{36}", "GitHub Personal Access Token"),
    (r"gho_[a-zA-Z0-9]{36}", "GitHub OAuth Token"),
    (r"eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}", "JWT Token"),
    (r"(?:postgres|redis)://[^:@\s]+:[^@\s]+@[^/\s]+", "Database connection string with non-default credentials"),
]

# Sensitive file names that should never be committed
SENSITIVE_FILENAMES = [
    r"^\.env(?:\.local|\.production|\.development|\.staging)?$",
    r"^credentials\.json$",
    r"^service-account.*\.json$",
    r"^secrets?\.json$",
    r"^id_rsa$",
    r"^id_ed25519$",
    r".*\.pem$",
    r".*\.key$",
    r".*\.p12$",
    r".*\.pfx$",
]

EXCLUDE_DIRS = {".git", "node_modules", ".pytest_cache", ".ruff_cache", ".mypy_cache", "venv", ".venv", "dist"}


def scan_working_tree():
    print("=== 1. Scanning Working Tree ===")
    findings = []
    large_files = []
    
    for root, dirs, files in os.walk(ROOT_DIR):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        
        for file in files:
            file_path = Path(root) / file
            rel_path = file_path.relative_to(ROOT_DIR)
            
            # Check sensitive filenames
            for pattern in SENSITIVE_FILENAMES:
                if re.match(pattern, file, re.IGNORECASE) and file != ".env.example":
                    findings.append({
                        "file": str(rel_path),
                        "type": "Sensitive File Found",
                        "match": file
                    })
            
            # Check file size (large files > 2MB)
            try:
                size_bytes = file_path.stat().st_size
                if size_bytes > 2 * 1024 * 1024 and not str(rel_path).startswith("node_modules"):
                    large_files.append({"file": str(rel_path), "size_mb": size_bytes / (1024 * 1024)})
            except Exception:
                pass
            
            # Scan text content for secret patterns
            if file in ["package-lock.json"] or file.endswith((".png", ".jpg", ".ico", ".svg")):
                continue
                
            try:
                content = file_path.read_text(encoding="utf-8", errors="ignore")
                for regex, desc in SECRET_PATTERNS:
                    matches = re.findall(regex, content)
                    for m in matches:
                        if "placeholder" in m.lower() or "your-" in m.lower() or "example" in m.lower():
                            continue
                        findings.append({
                            "file": str(rel_path),
                            "type": desc,
                            "match": m[:10] + "..." if len(m) > 10 else m
                        })
            except Exception:
                pass

    return findings, large_files


def scan_git_history():
    print("=== 2. Scanning Git History ===")
    git_findings = []
    try:
        commits_res = subprocess.run(
            ["git", "rev-list", "--all"],
            cwd=ROOT_DIR,
            capture_output=True
        )
        commits = commits_res.stdout.decode("utf-8", errors="ignore").strip().splitlines()
        print(f"Inspecting {len(commits)} commit(s) in Git history...")
        
        for commit in commits:
            if not commit.strip():
                continue
            show_res = subprocess.run(
                ["git", "show", commit.strip()],
                cwd=ROOT_DIR,
                capture_output=True
            )
            diff_text = show_res.stdout.decode("utf-8", errors="ignore")
            
            for regex, desc in SECRET_PATTERNS:
                matches = re.findall(regex, diff_text)
                for m in matches:
                    if "placeholder" in m.lower() or "your-" in m.lower() or "example" in m.lower():
                        continue
                    git_findings.append({
                        "commit": commit[:8],
                        "type": desc,
                        "match": m[:10] + "..." if len(m) > 10 else m
                    })
    except Exception as e:
        print(f"Git history scan error: {e}")

    return git_findings


def scan_frontend_isolation():
    print("=== 3. Scanning Frontend Secrets Isolation ===")
    frontend_dir = ROOT_DIR / "frontend" / "src"
    frontend_findings = []
    
    server_secrets_patterns = [
        r"OPENROUTER_API_KEY",
        r"RAZORPAY_KEY_SECRET",
        r"RAZORPAY_WEBHOOK_SECRET",
        r"POSTGRES_PASSWORD",
        r"APP_SECRET_KEY",
    ]
    
    if frontend_dir.exists():
        for root, dirs, files in os.walk(frontend_dir):
            for file in files:
                if file.endswith((".ts", ".tsx", ".js", ".jsx", ".html")):
                    fpath = Path(root) / file
                    content = fpath.read_text(encoding="utf-8", errors="ignore")
                    for pattern in server_secrets_patterns:
                        if re.search(pattern, content):
                            frontend_findings.append({
                                "file": str(fpath.relative_to(ROOT_DIR)),
                                "secret_referenced": pattern
                            })
    return frontend_findings


def main():
    tree_findings, large_files = scan_working_tree()
    history_findings = scan_git_history()
    frontend_findings = scan_frontend_isolation()
    
    print("\n================ SCAN RESULTS ================")
    print(f"Working Tree Secret Findings: {len(tree_findings)}")
    for f in tree_findings:
        print(f"  [!] {f['type']} in {f['file']}: {f['match']}")
        
    print(f"Large Files (>2MB): {len(large_files)}")
    for lf in large_files:
        print(f"  [-] {lf['file']} ({lf['size_mb']:.2f} MB)")
        
    print(f"Git History Secret Findings: {len(history_findings)}")
    for h in history_findings:
        print(f"  [!] Commit {h['commit']} {h['type']}: {h['match']}")
        
    print(f"Frontend Server-Secret Leaks: {len(frontend_findings)}")
    for fe in frontend_findings:
        print(f"  [!] {fe['file']} contains server secret reference: {fe['secret_referenced']}")
        
    total_issues = len(tree_findings) + len(history_findings) + len(frontend_findings)
    print(f"\nTOTAL CRITICAL/HIGH SECURITY ISSUES: {total_issues}")
    if total_issues > 0:
        sys.exit(1)
    else:
        print("ALL SECURITY SCANS PASSED CLEANLY (0 SECRETS DETECTED)")


if __name__ == "__main__":
    main()
