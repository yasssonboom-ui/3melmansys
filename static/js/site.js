const menuToggle = document.querySelector(".menu-toggle");
const mobileNavigation = document.querySelector(".mobile-nav-links");

const revealElements = document.querySelectorAll(".reveal");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (!prefersReducedMotion && window.gsap && window.ScrollTrigger) {
  const gsap = window.gsap;
  gsap.registerPlugin(window.ScrollTrigger);
  gsap.config({ nullTargetWarn: false });

  const revealOnScroll = (target, options = {}) => {
    gsap.fromTo(target, {
      autoAlpha: 0,
      y: options.y ?? 52,
      filter: "blur(8px)",
      scale: options.scale ?? 0.985,
    }, {
      autoAlpha: 1,
      y: 0,
      filter: "blur(0px)",
      scale: 1,
      duration: options.duration ?? 1.25,
      ease: "power3.out",
      stagger: options.stagger ?? 0.13,
      clearProps: "filter,transform,opacity,visibility",
      scrollTrigger: {
        trigger: options.trigger || target,
        start: options.start || "top 86%",
        once: true,
      },
    });
  };

  const pageHeader = document.querySelector(".site-header");
  if (pageHeader) {
    gsap.fromTo(".announcement", { autoAlpha: 0, y: -14 }, {
      autoAlpha: 1, y: 0, duration: 0.9, ease: "power2.out",
    });
    gsap.fromTo(pageHeader.querySelectorAll(".brand, .nav-links a, .nav-actions > *"), {
      autoAlpha: 0, y: -18,
    }, {
      autoAlpha: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.11, delay: 0.18,
    });
  }

  const hero = document.querySelector(".hero");
  if (hero) {
    const heroTimeline = gsap.timeline({ defaults: { ease: "power3.out" } });
    heroTimeline
      .fromTo(".hero-copy .eyebrow", { autoAlpha: 0, x: 22 }, { autoAlpha: 1, x: 0, duration: 0.9 })
      .fromTo(".hero-copy h1", { autoAlpha: 0, y: 38, filter: "blur(7px)" }, {
        autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 1.25,
      }, "-=0.48")
      .fromTo(".hero-copy > p", { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 1 }, "-=0.72")
      .fromTo(".hero-actions .button", { autoAlpha: 0, y: 20 }, {
        autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.18,
      }, "-=0.55")
      .fromTo(".hero-art .art-card", { autoAlpha: 0, y: 34, rotate: -2, scale: 0.94 }, {
        autoAlpha: 1, y: 0, rotate: 5, scale: 1, duration: 1.5, ease: "back.out(1.15)", clearProps: "transform,opacity,visibility",
      }, "-=1.05")
      .fromTo(".hero-art .art-spark", { autoAlpha: 0, scale: 0.65, rotate: -18 }, {
        autoAlpha: 1, scale: 1, rotate: 0, duration: 0.9, stagger: 0.2, ease: "back.out(1.8)", clearProps: "transform,opacity,visibility",
      }, "-=0.9");
  }

  gsap.utils.toArray(".benefit").forEach((benefit, index) => {
    revealOnScroll(benefit, { y: 38, scale: 0.97, duration: 1.05, stagger: 0, start: "top 90%" });
    gsap.fromTo(benefit.querySelector(".benefit-icon"), { autoAlpha: 0, rotate: -18, scale: 0.72 }, {
      autoAlpha: 1, rotate: 0, scale: 1, duration: 1, delay: index * 0.12, ease: "back.out(1.5)",
      scrollTrigger: { trigger: benefit, start: "top 90%", once: true },
    });
  });

  gsap.utils.toArray(".dashboard-stat").forEach((stat, index) => {
    gsap.fromTo(stat, { autoAlpha: 0, y: 32, scale: 0.94 }, {
      autoAlpha: 1, y: 0, scale: 1, duration: 1.05, delay: index * 0.14, ease: "power3.out",
      clearProps: "transform,opacity,visibility",
    });
  });

  gsap.utils.toArray(".section-heading").forEach((heading) => {
    revealOnScroll(heading, { y: 34, duration: 1.1 });
  });

  gsap.utils.toArray(".category-chip").forEach((chip, index) => {
    gsap.fromTo(chip, { autoAlpha: 0, y: 16, scale: 0.92 }, {
      autoAlpha: 1, y: 0, scale: 1, duration: 0.8, delay: index * 0.08, ease: "power2.out",
      scrollTrigger: { trigger: chip.parentElement, start: "top 91%", once: true },
      clearProps: "transform,opacity,visibility",
    });
  });

  gsap.utils.toArray(".product-card").forEach((card, index) => {
    const timeline = gsap.timeline({
      scrollTrigger: { trigger: card, start: "top 90%", once: true },
      delay: (index % 4) * 0.12,
    });
    timeline
      .fromTo(card, { autoAlpha: 0, y: 58, rotateX: 5, scale: 0.96 }, {
        autoAlpha: 1, y: 0, rotateX: 0, scale: 1, duration: 1.25, ease: "power3.out", clearProps: "transform,opacity,visibility",
      })
      .fromTo(card.querySelector(".product-photo"), { clipPath: "inset(12% 8% 12% 8% round 18px)" }, {
        clipPath: "inset(0% 0% 0% 0% round 0px)", duration: 1.1, ease: "power2.out", clearProps: "clipPath",
      }, "-=0.9")
      .fromTo(card.querySelectorAll(".product-info > *"), { autoAlpha: 0, y: 18 }, {
        autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.1, ease: "power2.out",
      }, "-=0.75");
  });

  gsap.utils.toArray(".story, .contact-intro, .contact-layout, .cart-heading, .checkout-heading").forEach((section) => {
    revealOnScroll(section, { y: 48, duration: 1.3, stagger: 0.16 });
  });

  gsap.utils.toArray(".cart-item, .checkout-item").forEach((item, index) => {
    gsap.fromTo(item, { autoAlpha: 0, x: 30, scale: 0.98 }, {
      autoAlpha: 1, x: 0, scale: 1, duration: 1, delay: index * 0.13, ease: "power3.out",
      scrollTrigger: { trigger: item, start: "top 91%", once: true },
      clearProps: "transform,opacity,visibility",
    });
  });

  const contactDetails = document.querySelector(".contact-details");
  if (contactDetails) {
    gsap.fromTo(contactDetails.children, { autoAlpha: 0, y: 24 }, {
      autoAlpha: 1, y: 0, duration: 0.95, stagger: 0.14, ease: "power2.out",
      scrollTrigger: { trigger: contactDetails, start: "top 86%", once: true },
      clearProps: "transform,opacity,visibility",
    });
  }

  const contactForm = document.querySelector(".contact-form-panel");
  if (contactForm) {
    gsap.fromTo(contactForm.querySelectorAll(".field, .button"), { autoAlpha: 0, y: 18 }, {
      autoAlpha: 1, y: 0, duration: 0.85, stagger: 0.12, delay: 0.3, ease: "power2.out",
      scrollTrigger: { trigger: contactForm, start: "top 86%", once: true },
      clearProps: "transform,opacity,visibility",
    });
  }

  const detailGallery = document.querySelector(".product-detail-gallery");
  if (detailGallery) {
    gsap.fromTo(detailGallery.querySelectorAll(".product-detail-image, .product-detail-placeholder"), {
      autoAlpha: 0, y: 36, scale: 0.97, clipPath: "inset(8% 6% 8% 6% round 18px)",
    }, {
      autoAlpha: 1, y: 0, scale: 1, clipPath: "inset(0% 0% 0% 0% round 12px)",
      duration: 1.25, stagger: 0.16, ease: "power3.out", clearProps: "filter,transform,clipPath,opacity,visibility",
    });
    revealOnScroll(document.querySelector(".product-detail-summary"), { y: 44, duration: 1.35, start: "top 88%" });
    gsap.fromTo(".product-detail-description-heading, .product-detail-description-copy", {
      autoAlpha: 0, y: 16,
    }, {
      autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.16, delay: 0.35, ease: "power2.out",
      scrollTrigger: { trigger: ".product-detail-summary", start: "top 88%", once: true },
      clearProps: "transform,opacity,visibility",
    });
  }

  const footer = document.querySelector(".site-footer");
  if (footer) {
    gsap.fromTo(footer.querySelectorAll(".brand, .footer-note, .footer-social .footer-link"), {
      autoAlpha: 0, y: 22,
    }, {
      autoAlpha: 1, y: 0, duration: 0.95, stagger: 0.1, ease: "power2.out",
      scrollTrigger: { trigger: footer, start: "top 94%", once: true },
      clearProps: "transform,opacity,visibility",
    });
  }

  gsap.utils.toArray(".contact-form-panel, .panel").forEach((panel) => {
    if (!panel.closest(".admin-page")) {
      revealOnScroll(panel, { y: 30, duration: 1.15 });
    }
  });
} else if (revealElements.length && !prefersReducedMotion && "IntersectionObserver" in window) {
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
  }, 4200);
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

const dashboardSections = [...document.querySelectorAll("[data-dashboard-section]")];
const dashboardLinks = [...document.querySelectorAll("[data-dashboard-link]")];
const adminMenuToggle = document.querySelector("[data-admin-menu-toggle]");
const adminSidebar = document.querySelector("#admin-sidebar");

if (dashboardSections.length && dashboardLinks.length) {
  const activateDashboardSection = (name) => {
    dashboardSections.forEach((section) => {
      section.hidden = section.dataset.dashboardSection !== name;
    });
    dashboardLinks.forEach((link) => {
      if (link.dataset.dashboardLink === name) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  };

  const requestedSection = window.location.hash.slice(1);
  const initialLink = dashboardLinks.find(
    (link) => link.dataset.dashboardLink === requestedSection || link.hash.slice(1) === requestedSection
  );
  activateDashboardSection(initialLink?.dataset.dashboardLink || "overview");

  dashboardLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      activateDashboardSection(link.dataset.dashboardLink);
      window.history.replaceState(null, "", link.hash);
      adminSidebar?.classList.remove("is-open");
      adminMenuToggle?.setAttribute("aria-expanded", "false");
    });
  });

  if (adminMenuToggle && adminSidebar) {
    adminMenuToggle.addEventListener("click", () => {
      const isOpen = adminMenuToggle.getAttribute("aria-expanded") === "true";
      adminMenuToggle.setAttribute("aria-expanded", String(!isOpen));
      adminSidebar.classList.toggle("is-open", !isOpen);
    });

    document.addEventListener("click", (event) => {
      if (!adminMenuToggle.contains(event.target) && !adminSidebar.contains(event.target)) {
        adminSidebar.classList.remove("is-open");
        adminMenuToggle.setAttribute("aria-expanded", "false");
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        adminSidebar.classList.remove("is-open");
        adminMenuToggle.setAttribute("aria-expanded", "false");
      }
    });
  }
}
