// Seitenleiste: zeigt genau einen Bereich, gewählt über den URL-Hash (#guard).
const sections = [...document.querySelectorAll("main > section")];
const links = [...document.querySelectorAll("nav a")];

function show() {
  const target = sections.find(s => `#${s.dataset.section}` === location.hash) ?? sections[0];
  for (const s of sections) s.hidden = s !== target;
  for (const a of links) {
    if (a.getAttribute("href") === `#${target.dataset.section}`) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  }
}

addEventListener("hashchange", show);
show();
