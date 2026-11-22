"""Rebuild the included battery investigation demo using Python 3's standard library."""
import base64
import hashlib
import json
from pathlib import Path
import re

TOOLS = Path(__file__).resolve().parent
PACKAGE = TOOLS.parent
APP = PACKAGE / '天枢工作台' / 'app'
CASE = PACKAGE / '案例'


def read(path):
    return path.read_text(encoding='utf-8-sig')


def build():
    recording = json.loads(read(CASE / '动力电池实录.json'))
    pdf = (CASE / 'cabia.pdf').read_bytes()
    pdf_hash = hashlib.sha256(pdf).hexdigest()
    sources = recording['verifiedLedger']['sources'].values()
    if not any(source.get('sha256') == pdf_hash for source in sources):
        raise ValueError('协会 PDF 与本次调查实录登记的校验值不一致。')

    icons = re.search(r'<svg class="sprite" aria-hidden="true">(<symbol id="board-.*?)</svg>',
                      read(APP / 'index.html'), re.DOTALL)
    if not icons:
        raise ValueError('工作台首页缺少调查导图的图标集合。')

    css = '\n'.join(read(TOOLS / name) for name in
                    ('standalone.css', 'final-board.css', 'player.css', 'feed.css'))
    board = read(APP / 'research-board.js').replace('实机录制 · 回放',
                                                    f"实机录制 · {recording['model']} · 回放")
    fields = {
        '__CSS__': css + read(TOOLS / 'source.css'),
        '__ICONS__': icons.group(1),
        '__MD__': read(APP / 'markdown-it.min.js').replace('</script', '<\\/script'),
        '__BOARD__': '\n'.join([read(APP/'evidence-pages.js'), read(APP/'supply-network.js'), board]),
        '__PDF_BYTES__': base64.b64encode(pdf).decode('ascii'),
        '__PDF_HASH__': json.dumps(pdf_hash),
        '__RECORD__': json.dumps(recording, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c'),
        '__PLAYER__': read(TOOLS / 'case-player.js'),
    }
    template = read(TOOLS / 'player.html')
    if set(re.findall(r'__[A-Z_]+__', template)) != set(fields):
        raise ValueError('播放器模板中的资源占位符与构建器不匹配。')
    html = re.sub(r'__[A-Z_]+__', lambda match: fields[match.group()], template)
    output = PACKAGE / '实机演示.html'
    with output.open('w', encoding='utf-8', newline='\r\n') as file:
        file.write(html)
    print('已生成', output)


if __name__ == '__main__':
    build()
