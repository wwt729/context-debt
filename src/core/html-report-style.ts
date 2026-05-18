export const htmlReportCss = `
:root {
  color-scheme: light;
  --bg: #f6f7f9;
  --panel: #ffffff;
  --text: #17202a;
  --muted: #667085;
  --border: #d9dee7;
  --high: #b42318;
  --medium: #b54708;
  --low: #175cd3;
  --info: #475467;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
.shell {
  width: min(1120px, calc(100% - 32px));
  margin: 0 auto;
  padding: 32px 0 48px;
}
.header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--border);
}
.header p, .header span {
  margin: 0;
  color: var(--muted);
}
.header h1 {
  margin: 6px 0;
  font-size: 34px;
  line-height: 1.1;
  letter-spacing: 0;
}
.header strong {
  font-size: 52px;
  line-height: 1;
}
.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin: 24px 0;
}
.summary-card, .issue-card, .empty, .metadata {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 8px;
}
.summary-card {
  padding: 16px;
  border-top-width: 4px;
}
.summary-card span {
  display: block;
  color: var(--muted);
  font-size: 13px;
}
.summary-card strong {
  display: block;
  margin-top: 8px;
  font-size: 30px;
}
.high { border-color: color-mix(in srgb, var(--high) 45%, var(--border)); }
.medium { border-color: color-mix(in srgb, var(--medium) 45%, var(--border)); }
.low { border-color: color-mix(in srgb, var(--low) 45%, var(--border)); }
.info { border-color: color-mix(in srgb, var(--info) 35%, var(--border)); }
.issue-group {
  margin-top: 24px;
}
.issue-group h2, .metadata h2 {
  margin: 0 0 12px;
  font-size: 18px;
  letter-spacing: 0;
}
.issue-card {
  margin-top: 12px;
  padding: 18px;
}
.issue-card header {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 14px;
}
.issue-card header span {
  color: var(--muted);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px;
}
.issue-card h3 {
  margin: 0;
  font-size: 18px;
  letter-spacing: 0;
}
.detail {
  display: grid;
  grid-template-columns: 150px minmax(0, 1fr);
  gap: 16px;
  padding: 8px 0;
  border-top: 1px solid #edf0f5;
}
dt {
  color: var(--muted);
  font-weight: 600;
}
dd {
  margin: 0;
  overflow-wrap: anywhere;
}
.empty, .metadata {
  padding: 18px;
}
.metadata {
  margin-top: 28px;
}
@media (max-width: 720px) {
  .header {
    align-items: flex-start;
    flex-direction: column;
  }
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .detail {
    grid-template-columns: 1fr;
    gap: 4px;
  }
}
`;
