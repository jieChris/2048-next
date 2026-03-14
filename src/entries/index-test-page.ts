import { bootstrapHomeFamilyPage } from "./home-family-bootstrap";

function fitUsernameText(): void {
  const fitBox = document.querySelector<HTMLElement>(".username-bg-fit-box");
  const text = document.querySelector<HTMLElement>(".username-bg-text");
  if (!fitBox || !text) {
    return;
  }

  const maxFontSize = 103;
  const minFontSize = 58;
  const availableWidth = Math.max(fitBox.clientWidth, 0);
  const availableHeight = Math.max(fitBox.clientHeight, 0);

  text.style.fontSize = `${maxFontSize}px`;

  const widthScale = availableWidth > 0 ? availableWidth / text.scrollWidth : 1;
  const heightScale = availableHeight > 0 ? availableHeight / text.scrollHeight : 1;
  const scale = Math.min(widthScale, heightScale, 1);
  let nextSize = Math.max(minFontSize, Math.floor(maxFontSize * scale * 0.97));

  text.style.fontSize = `${nextSize}px`;

  while (
    nextSize > minFontSize &&
    (text.scrollWidth > availableWidth || text.scrollHeight > availableHeight)
  ) {
    nextSize -= 2;
    text.style.fontSize = `${nextSize}px`;
  }
}

await bootstrapHomeFamilyPage("index_test");

window.addEventListener("resize", fitUsernameText);
window.addEventListener("load", fitUsernameText);

if (document.fonts?.ready) {
  document.fonts.ready.then(fitUsernameText);
}
