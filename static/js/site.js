const menuToggle = document.querySelector(".menu-toggle");
const mobileNavigation = document.querySelector(".mobile-nav-links");
const cartDialog = document.querySelector("[data-cart-dialog]");
const cartDialogContent = cartDialog?.querySelector("[data-cart-dialog-content]");
const cartDialogStatus = cartDialog?.querySelector("[data-cart-dialog-status]");

const cartFeedback = document.createElement("div");
cartFeedback.className = "cart-feedback";
cartFeedback.setAttribute("role", "status");
cartFeedback.setAttribute("aria-live", "polite");
cartFeedback.setAttribute("aria-atomic", "true");
document.body.append(cartFeedback);

let cartFeedbackTimer;
const showCartFeedback = (message, isError = false) => {
  cartFeedback.textContent = message;
  cartFeedback.classList.toggle("is-error", isError);
  cartFeedback.classList.add("is-visible");
  window.clearTimeout(cartFeedbackTimer);
  cartFeedbackTimer = window.setTimeout(() => cartFeedback.classList.remove("is-visible"), 2600);
};

const updateCartCount = (cartCount) => {
  document.querySelectorAll(".cart-count").forEach((count) => {
    count.textContent = cartCount;
    count.classList.remove("is-updated");
    void count.offsetWidth;
    count.classList.add("is-updated");
  });
  document.querySelectorAll(".cart-link").forEach((link) => {
    link.setAttribute("aria-label", `سلة المشتريات، ${cartCount} منتجات`);
  });
};

const showCartDialogStatus = (message, isError = false) => {
  if (!cartDialogStatus) return;
  cartDialogStatus.textContent = message;
  cartDialogStatus.hidden = !message;
  cartDialogStatus.classList.toggle("is-error", isError);
};

document.addEventListener("click", (event) => {
  const cartLink = event.target.closest(".cart-link");
  if (!cartLink || !cartDialog || typeof cartDialog.showModal !== "function") return;

  event.preventDefault();
  if (!cartDialog.open) cartDialog.showModal();
  showCartDialogStatus("");
});

cartDialog?.querySelector("[data-cart-close]")?.addEventListener("click", () => cartDialog.close());
cartDialog?.addEventListener("click", (event) => {
  if (event.target === cartDialog) cartDialog.close();
});
cartDialog?.addEventListener("submit", async (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || !form.matches("[data-cart-update]")) return;

  event.preventDefault();
  const submitter = event.submitter;
  if (submitter instanceof HTMLButtonElement) submitter.disabled = true;

  try {
    const response = await fetch(form.action, {
      method: "POST",
      body: new FormData(form),
      headers: { "X-Requested-With": "XMLHttpRequest" },
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || "تعذر تحديث السلة.");
    }
    cartDialogContent.innerHTML = result.html;
    updateCartCount(result.cart_count);
    showCartDialogStatus(result.message);
  } catch (error) {
    showCartDialogStatus(error.message || "تعذر تحديث السلة. حاول مرة تانية.", true);
  } finally {
    if (submitter instanceof HTMLButtonElement) submitter.disabled = false;
  }
});

if (window.location.hash === "#cart" && cartDialog && typeof cartDialog.showModal === "function") {
  cartDialog.showModal();
}

document.addEventListener("submit", async (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || !form.matches(".product-purchase-form, .product-detail-purchase")) return;
  const submitter = event.submitter;
  if (submitter && !submitter.hasAttribute("data-add-to-cart")) return;
  const button = submitter || form.querySelector("[data-add-to-cart]");

  event.preventDefault();
  if (!(button instanceof HTMLButtonElement) || button.disabled) return;

  const originalButtonContent = button.innerHTML;
  button.disabled = true;
  button.textContent = "بنضيف للسلة...";
  button.classList.remove("is-added");

  try {
    const response = await fetch(form.action, {
      method: "POST",
      body: new FormData(form),
      headers: { "X-Requested-With": "XMLHttpRequest" },
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      showCartFeedback(result.message || "حصلت مشكلة وإحنا بنضيف المنتج للسلة.", true);
      return;
    }

    updateCartCount(result.cart_count);
    if (cartDialogContent && result.html) cartDialogContent.innerHTML = result.html;
    button.classList.add("is-added");
    showCartFeedback(result.message);
  } catch {
    showCartFeedback("تعذر الاتصال. حاول تضيف المنتج للسلة مرة تانية.", true);
  } finally {
    button.disabled = false;
    button.innerHTML = originalButtonContent;
  }
});

document.querySelectorAll("[data-product-url]").forEach((card) => {
  const navigateToProduct = (event) => {
    if (event.target.closest("a, button, input, select, textarea, summary, form, label")) return;
    if (event.type === "keydown" && event.key !== "Enter") return;
    if (event.type === "keydown") event.preventDefault();
    window.location.assign(card.dataset.productUrl);
  };

  card.addEventListener("click", navigateToProduct);
  card.addEventListener("keydown", navigateToProduct);
});

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

document.querySelectorAll("[data-photo-showcase]").forEach((track) => {
  const slides = [...track.querySelectorAll(".photo-showcase-item")];
  const status = document.querySelector("[data-showcase-status]");
  const showcase = track.closest(".photo-showcase");
  if (slides.length < 2 || !status) {
    return;
  }

  let activeIndex = 0;
  let scrollFrame = 0;
  let autoplayInterval;
  const updateStatus = () => {
    status.textContent = `${activeIndex + 1} / ${slides.length}`;
  };
  const updateActiveSlide = () => {
    scrollFrame = 0;
    const trackCenter = track.getBoundingClientRect().left + track.clientWidth / 2;
    activeIndex = slides.reduce((closestIndex, slide, index) => {
      const slideCenter = slide.getBoundingClientRect().left + slide.clientWidth / 2;
      const closestCenter = slides[closestIndex].getBoundingClientRect().left + slides[closestIndex].clientWidth / 2;
      return Math.abs(slideCenter - trackCenter) < Math.abs(closestCenter - trackCenter) ? index : closestIndex;
    }, 0);
    updateStatus();
  };
  const scrollToSlide = (index) => {
    activeIndex = Math.max(0, Math.min(slides.length - 1, index));
    updateStatus();
    const trackCenter = track.getBoundingClientRect().left + track.clientWidth / 2;
    const slideCenter = slides[activeIndex].getBoundingClientRect().left + slides[activeIndex].clientWidth / 2;
    track.scrollBy({
      left: slideCenter - trackCenter,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  };
  const stopAutoplay = () => {
    window.clearInterval(autoplayInterval);
    autoplayInterval = undefined;
  };
  const startAutoplay = () => {
    stopAutoplay();
    if (prefersReducedMotion || document.hidden || showcase?.matches(":hover") || showcase?.contains(document.activeElement)) {
      return;
    }
    autoplayInterval = window.setInterval(() => {
      scrollToSlide((activeIndex + 1) % slides.length);
    }, 3000);
  };

  showcase?.addEventListener("pointerenter", stopAutoplay);
  showcase?.addEventListener("pointerleave", startAutoplay);
  showcase?.addEventListener("focusin", stopAutoplay);
  showcase?.addEventListener("focusout", (event) => {
    if (!showcase.contains(event.relatedTarget)) {
      startAutoplay();
    }
  });
  document.addEventListener("visibilitychange", startAutoplay);
  track.addEventListener("scroll", () => {
    if (!scrollFrame) {
      scrollFrame = window.requestAnimationFrame(updateActiveSlide);
    }
  }, { passive: true });
  updateStatus();
  startAutoplay();
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

const orderPushSettings = document.querySelector("[data-order-push]");
if (orderPushSettings) {
  const pushToggle = orderPushSettings.querySelector("[data-order-push-toggle]");
  const pushStatus = orderPushSettings.querySelector("[data-order-push-status]");
  let currentPushSubscription;

  const setPushStatus = (message, isError = false) => {
    pushStatus.textContent = message;
    pushStatus.classList.toggle("is-error", isError);
  };
  const decodeVapidKey = (key) => {
    const padding = "=".repeat((4 - key.length % 4) % 4);
    const base64 = (key + padding).replace(/-/g, "+").replace(/_/g, "/");
    return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
  };
  const submitPushSubscription = async (url, fields) => {
    const body = new URLSearchParams({
      _csrf_token: orderPushSettings.dataset.csrfToken,
      ...fields,
    });
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || "تعذر تحديث إعدادات الإشعارات.");
    }
    return result;
  };

  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    pushToggle.disabled = true;
    setPushStatus("المتصفح على هذا الجهاز لا يدعم إشعارات المواقع.", true);
  } else if (!orderPushSettings.dataset.publicKey) {
    pushToggle.disabled = true;
  } else {
    navigator.serviceWorker.register("/service-worker.js")
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => {
        currentPushSubscription = subscription;
        pushToggle.textContent = subscription ? "إيقاف إشعارات هذا الجهاز" : "فعّل إشعارات الطلبات";
        if (subscription) setPushStatus("إشعارات الطلبات مفعّلة على هذا الجهاز.");
      })
      .catch((error) => {
        pushToggle.disabled = true;
        setPushStatus(error.message || "تعذر تجهيز إشعارات هذا الجهاز.", true);
      });

    pushToggle.addEventListener("click", async () => {
      pushToggle.disabled = true;
      try {
        const registration = await navigator.serviceWorker.ready;
        if (currentPushSubscription) {
          await submitPushSubscription(orderPushSettings.dataset.unsubscribeUrl, {
            endpoint: currentPushSubscription.endpoint,
          });
          await currentPushSubscription.unsubscribe();
          currentPushSubscription = null;
          setPushStatus("تم إيقاف إشعارات الطلبات على هذا الجهاز.");
          pushToggle.textContent = "فعّل إشعارات الطلبات";
          return;
        }

        let permission = Notification.permission;
        if (permission === "default") permission = await Notification.requestPermission();
        if (permission !== "granted") {
          throw new Error("اسمح للموقع بإرسال الإشعارات من إعدادات المتصفح.");
        }

        currentPushSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeVapidKey(orderPushSettings.dataset.publicKey),
        });
        const result = await submitPushSubscription(orderPushSettings.dataset.subscribeUrl, {
          subscription: JSON.stringify(currentPushSubscription),
        });
        setPushStatus(result.message);
        pushToggle.textContent = "إيقاف إشعارات هذا الجهاز";
      } catch (error) {
        setPushStatus(error.message || "تعذر تفعيل إشعارات الطلبات.", true);
      } finally {
        pushToggle.disabled = false;
      }
    });
  }
}
