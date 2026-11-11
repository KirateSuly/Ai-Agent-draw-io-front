/**
 * 从一段文本中提取 draw.io XML。
 * 提示词要求只输出 XML，但模型仍可能包一层 Markdown 代码块或补充说明，这里做兼容。
 */
function extractFromText(content: string): string | null {
  if (!content) {
    return null;
  }

  let text = content.trim();
  const fenced = Array.from(
    text.matchAll(/```(?:xml)?\s*([\s\S]*?)```/gi),
  ).filter((match) => /<mxfile|<mxGraphModel/i.test(match[1] ?? ""));
  if (fenced.length) {
    text = fenced[fenced.length - 1][1].trim();
  }

  const mxfiles = Array.from(
    text.matchAll(/<mxfile[\s\S]*?<\/mxfile>/gi),
  );
  if (mxfiles.length) {
    return mxfiles[mxfiles.length - 1][0];
  }

  const graphModels = Array.from(
    text.matchAll(/<mxGraphModel[\s\S]*?<\/mxGraphModel>/gi),
  );
  if (graphModels.length) {
    return [
      '<mxfile host="app.diagrams.net">',
      '<diagram id="ai-agent-diagram" name="Page-1">',
      graphModels[graphModels.length - 1][0],
      "</diagram>",
      "</mxfile>",
    ].join("");
  }

  return null;
}

export function extractDrawioXml(content: string): string | null {  const direct = extractFromText(content);
  if (direct) {
    return direct;
  }

  // 兼容 XML 被 HTML 转义后返回的情况，例如 &lt;mxGraphModel ...&gt;
  const decoded = content
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");

  return decoded !== content ? extractFromText(decoded) : null;
}

export interface DiagramViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CellGeometry extends DiagramViewBox {
  parent: string;
}

/**
 * 计算图表内容在 draw.io 模型坐标系中的包围盒。
 * draw.io 自带的 fit 参数面对带页面尺寸的 XML 时表现不稳定，显式 viewbox 更可靠。
 */
export function getDiagramViewBox(xml: string): DiagramViewBox | null {
  if (typeof DOMParser === "undefined" || !xml) {
    return null;
  }

  try {
    const document = new DOMParser().parseFromString(xml, "application/xml");
    if (document.querySelector("parsererror")) {
      return null;
    }

    const model = document.querySelector("mxGraphModel");
    if (!model) {
      return null;
    }

    const cells = Array.from(model.querySelectorAll("mxCell"));
    const geometries = new Map<string, CellGeometry>();

    for (const cell of cells) {
      const id = cell.getAttribute("id");
      const geometry = Array.from(cell.children).find(
        (child) => child.tagName === "mxGeometry",
      );
      if (!id || !geometry) {
        continue;
      }

      const x = Number(geometry.getAttribute("x") ?? 0);
      const y = Number(geometry.getAttribute("y") ?? 0);
      const width = Number(geometry.getAttribute("width") ?? 0);
      const height = Number(geometry.getAttribute("height") ?? 0);

      if (
        !Number.isFinite(x) ||
        !Number.isFinite(y) ||
        !Number.isFinite(width) ||
        !Number.isFinite(height)
      ) {
        continue;
      }

      geometries.set(id, {
        x,
        y,
        width,
        height,
        parent: cell.getAttribute("parent") ?? "",
      });
    }

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const cell of cells) {
      if (cell.getAttribute("vertex") !== "1") {
        continue;
      }

      const id = cell.getAttribute("id");
      const ownGeometry = id ? geometries.get(id) : null;
      if (!id || !ownGeometry) {
        continue;
      }

      let absX = 0;
      let absY = 0;
      let cursor: string | undefined = id;
      const visited = new Set<string>();

      while (cursor && !visited.has(cursor)) {
        visited.add(cursor);
        const current = geometries.get(cursor);
        if (!current) {
          break;
        }
        absX += current.x;
        absY += current.y;
        cursor = current.parent || undefined;
      }

      minX = Math.min(minX, absX);
      minY = Math.min(minY, absY);
      maxX = Math.max(maxX, absX + ownGeometry.width);
      maxY = Math.max(maxY, absY + ownGeometry.height);
    }

    if (
      !Number.isFinite(minX) ||
      !Number.isFinite(minY) ||
      maxX <= minX ||
      maxY <= minY
    ) {
      return null;
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  } catch {
    return null;
  }
}

