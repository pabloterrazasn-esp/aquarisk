document.addEventListener("DOMContentLoaded", () => {
  const langLinks = document.querySelectorAll("[data-lang]");
  const currentUrl = window.location.href.replace(/#.*$/, "");

  langLinks.forEach((link) => {
    const lang = link.getAttribute("data-lang");

    if (lang === "es") {
      link.href = currentUrl;
      link.classList.add("is-active");
      return;
    }

    const target = encodeURIComponent(currentUrl);
    link.href = `https://translate.google.com/translate?sl=es&tl=${lang}&u=${target}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  });
});
