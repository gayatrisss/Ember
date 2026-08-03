// Declares what colour each end of the page is, so the overscroll gutters can match.
//
// The rubber-band gutters are painted by the canvas, which takes exactly one
// background for the whole document. A page whose two ends differ (dark nav at the
// top, wax footer at the bottom) can't be served by one colour, so globals.css
// splits them: the bottom gutter comes from the canvas, the top from a cap element
// offset above body. Both read CSS vars that this marker sets.
//
// Rendering a marker element rather than toggling a class on <html> from JS keeps
// the colours correct on first paint and unmounts them automatically on navigation.
// The unions are deliberately narrow: every value here has a matching rule in
// globals.css, so an unsupported colour is a type error rather than a silent no-op.

type TopColor = "night" | "evergreen";
type BottomColor = "wax" | "night";

export default function PageEdges({
  top = "night",
  bottom = "wax",
}: {
  top?: TopColor;
  bottom?: BottomColor;
}) {
  return <span hidden data-page-top={top} data-page-bottom={bottom} />;
}
