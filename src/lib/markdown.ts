type MarkdownRuntime = {
  renderMarkdown: (content: string) => string
  renderHtml: (content: string) => string
}

let markdownPromise: Promise<MarkdownRuntime> | null = null

function loadMarkdown(): Promise<MarkdownRuntime> {
  if (!markdownPromise) {
    markdownPromise = Promise.all([import('marked'), import('dompurify')]).then(
      ([{ marked }, DOMPurifyModule]) => {
        const DOMPurify = DOMPurifyModule.default

        marked.setOptions({
          gfm: true,
          breaks: true,
        })

        return {
          renderMarkdown(content: string) {
            const html = marked.parse(content, { async: false }) as string
            return DOMPurify.sanitize(html)
          },
          renderHtml(content: string) {
            return DOMPurify.sanitize(content)
          },
        }
      },
    )
  }

  return markdownPromise
}

export async function renderMarkdown(content: string): Promise<string> {
  const markdown = await loadMarkdown()
  return markdown.renderMarkdown(content)
}

export async function renderHtml(content: string): Promise<string> {
  const markdown = await loadMarkdown()
  return markdown.renderHtml(content)
}