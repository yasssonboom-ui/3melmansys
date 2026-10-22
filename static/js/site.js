const menuToggle = document.querySelector(".menu-toggle");
const mobileNavigation = document.querySelector(".mobile-nav-links");

const revealElements = document.querySelectorAll(".reveal");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (revealElements.length && !prefersReducedMotion && "IntersectionObserver" in window) {
  document.body.classList.add("animations-ready");
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -35px 0px" });

  revealElements.forEach((element) => revealObserver.observe(element));
} else {
  revealElements.forEach((element) => element.classList.add("is-visible"));
}

document.querySelectorAll("[data-product-gallery]").forEach((gallery) => {
  const images = [...gallery.querySelectorAll("img")];
  if (images.length < 2) {
    return;
  }

  let activeIndex = 0;
  window.setInterval(() => {
    images[activeIndex].classList.remove("is-active");
    images[activeIndex].setAttribute("aria-hidden", "true");
    activeIndex = (activeIndex + 1) % images.length;
    images[activeIndex].classList.add("is-active");
    images[activeIndex].removeAttribute("aria-hidden");
  }, 2800);
});

if (menuToggle && mobileNavigation) {
  const closeMenu = () => {
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "افتح القائمة");
    mobileNavigation.classList.remove("is-open");
  };

  menuToggle.addEventListener("click", () => {
    const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!isExpanded));
    menuToggle.setAttribute("aria-label", isExpanded ? "افتح القائمة" : "اقفل القائمة");
    mobileNavigation.classList.toggle("is-open", !isExpanded);
  });

  mobileNavigation.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      closeMenu();
    }
  });

  document.addEventListener("click", (event) => {
    if (!menuToggle.contains(event.target) && !mobileNavigation.contains(event.target)) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
      menuToggle.focus();
    }
  });

  window.addEventListener("resize", () => {
    if (window.matchMedia("(min-width: 601px)").matches) {
      closeMenu();
    }
  });
}
