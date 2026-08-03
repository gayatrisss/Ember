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
  bottomMobile = bottom,
}: {
  top?: TopColor;
  bottom?: BottomColor;
  /**
   * The bottom gutter below `lg`, when it differs. Set this to the colour of the
   * page's fixed bottom chrome (the mobile tab bar is `night`).
   *
   * Structurally the document still ends at the footer, but on iOS a fixed bar
   * translates with the page during a bounce. If the gutter doesn't match the bar,
   * the bar appears to lift off a bright sliver — reads as a flicker at the bottom
   * of the scroll. Matching it makes that movement invisible.
   */
  bottomMobile?: BottomColor;
}) {
  return (
    <span
      hidden
      data-page-top={top}
      data-page-bottom={bottom}
      data-page-bottom-mobile={bottomMobile}
    />
  );
}
