from flask import Flask, request, jsonify
import subprocess
import json
import os
import tempfile
from urllib.parse import urlparse

app = Flask(__name__)

EXTRACTOR_LABELS = {
    'douyin': '抖音',
    'xiaohongshu': '小红书',
    'weibo': '微博',
    'bilibili': 'B站',
    'instagram': 'Instagram',
    'twitter': 'Twitter/X',
    'youtube': 'YouTube',
    'tiktok': 'TikTok',
    'facebook': 'Facebook',
    'pinterest': 'Pinterest',
    'threads': 'Threads',
    'rednote': '小红书',
}

NEEDS_COOKIES_DOMAINS = ['douyin.com', 'iesdouyin.com']

def get_platform_label(extractor_key):
    key = (extractor_key or '').lower().replace('tab', '').replace('ie', '')
    for k, v in EXTRACTOR_LABELS.items():
        if k in key:
            return v
    return extractor_key or '未知平台'


def fetch_guest_cookies(url):
    """Visit Douyin with curl_cffi to get real server-set cookies."""
    from curl_cffi import requests as curl_requests
    import time

    parsed = urlparse(url)
    domain = parsed.netloc or parsed.path.split('/')[0]

    session = curl_requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9',
    })

    try:
        session.get(f'https://{domain}/', impersonate='chrome120', timeout=15)
    except Exception:
        pass

    fd, path = tempfile.mkstemp(suffix='.txt', prefix='ytdl_cookies_')
    now = int(time.time())
    with os.fdopen(fd, 'w', encoding='utf-8') as f:
        f.write('# Netscape HTTP Cookie File\n\n')
        for cookie in session.cookies.jar:
            domain_flag = 'TRUE' if cookie.domain.startswith('.') else 'FALSE'
            exp = cookie.expires or (now + 365 * 86400)
            f.write(
                f'{cookie.domain}\t'
                f'{domain_flag}\t'
                f'{cookie.path}\t'
                f'{"TRUE" if cookie.secure else "FALSE"}\t'
                f'{exp}\t'
                f'{cookie.name}\t'
                f'{cookie.value}\n'
            )
    return path


def needs_cookies(url):
    parsed = urlparse(url)
    domain = parsed.netloc or ''
    for d in NEEDS_COOKIES_DOMAINS:
        if d in domain:
            return True
    return False


@app.route('/api/parse')
def parse():
    url = request.args.get('url')
    if not url:
        return jsonify({'success': False, 'message': '请提供链接'})

    cmd = ['python', '-m', 'yt_dlp', '-j', '--no-download', '--no-playlist',
           '--no-check-formats', '--socket-timeout', '20',
           '--impersonate', 'chrome']

    cookie_file = None
    try:
        if needs_cookies(url):
            cookie_file = fetch_guest_cookies(url)
            cmd.extend(['--cookies', cookie_file])

        cmd.append(url)

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)

        if result.returncode != 0:
            err = result.stderr.strip().split('\n')[-1] if result.stderr else 'unknown error'
            return jsonify({'success': False, 'message': f'yt-dlp 解析失败: {err[:300]}'})

        info = json.loads(result.stdout)
        extractor = info.get('extractor_key', '')

        data = {
            'platform': extractor,
            'platformLabel': get_platform_label(extractor),
            'title': info.get('title') or info.get('description') or '',
            'author': info.get('uploader') or info.get('creator') or info.get('channel') or '',
            'cover': info.get('thumbnail') or '',
            'videoUrl': '',
            'images': [],
            'type': 'video',
            'headers': {
                'User-Agent': info.get('http_headers', {}).get('User-Agent',
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
                'Referer': info.get('webpage_url', url)
            }
        }

        formats = info.get('formats', [])
        entries = info.get('entries', [])

        if entries:
            all_images = []
            for entry in entries:
                entry_formats = entry.get('formats', [])
                for f in entry_formats:
                    if f.get('vcodec') == 'none' and f.get('acodec') == 'none':
                        all_images.append(f.get('url'))
            if all_images:
                data['type'] = 'images'
                data['images'] = all_images
                data['cover'] = all_images[0] if all_images else data['cover']
                return jsonify({'success': True, 'data': data})

        if formats:
            merged = [f for f in formats
                      if f.get('vcodec') != 'none' and f.get('acodec') != 'none' and f.get('protocol') == 'https']
            if not merged:
                merged = [f for f in formats
                          if f.get('vcodec') != 'none' and f.get('acodec') != 'none']
            if not merged:
                merged = [f for f in formats if f.get('vcodec') != 'none']

            if merged:
                best = max(merged, key=lambda f: (f.get('height') or 0, f.get('filesize') or 0))
                data['videoUrl'] = best.get('url', '')
                if best.get('http_headers'):
                    data['headers'] = best['http_headers']

        if not data['videoUrl'] and not data['images']:
            url_field = info.get('url') or info.get('webpage_url') or ''
            if url_field:
                data['videoUrl'] = url_field

        if not data['videoUrl'] and not data['images']:
            return jsonify({'success': False, 'message': '未提取到媒体资源'})

        return jsonify({'success': True, 'data': data})

    except subprocess.TimeoutExpired:
        return jsonify({'success': False, 'message': '解析超时'})
    except json.JSONDecodeError:
        return jsonify({'success': False, 'message': f'JSON解析失败: {result.stdout[:300]}'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)[:500]})
    finally:
        if cookie_file:
            try:
                os.unlink(cookie_file)
            except Exception:
                pass


@app.route('/api/health')
def health():
    try:
        subprocess.run(['python', '-m', 'yt_dlp', '--version'], capture_output=True, text=True, timeout=5)
        return jsonify({'status': 'ok'})
    except Exception:
        return jsonify({'status': 'error', 'message': 'yt-dlp not found'}), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
