$(() => {

  const swiper = new Swiper(".banner-slider-swiper", {
    loop: true,
    pagination: {
      el: ".swiper-pagination",
      clickable: true,
    },
    autoplay: {
      delay: 2500,
      disableOnInteraction: false,
    },
  });

  $(".section-tab-hover .tab-item").on("click, mouseover", function () {
    let indx = $(this).index();
    console.log(indx);
    $(".section-tab-hover .tab-item").removeClass("active");
    $(this).addClass("active");
    $(this)
      .closest(".section-tab-hover")
      .find(".bg-img-wrap")
      .find("img")
      .removeClass("active");
    $(this)
      .closest(".section-tab-hover")
      .find(".bg-img-wrap")
      .find("img")
      .eq(indx)
      .addClass("active");
  });
});
$(() => {
  //console.clear();

  gsap.registerPlugin(ScrollTrigger);

  const panels = gsap.utils.toArray(".panel");
  const contentoEls = gsap.utils.toArray(".contento");

  const toggleReveal = (index) => {
    const next = contentoEls[index];
    const prev = contentoEls[index - 1];
    next && next.classList.toggle("revealed");
    prev && prev.classList.toggle("revealed");
  };

  gsap.set(panels, {
    yPercent: (i) => (i ? 100 : 0),
    opacity: (i) => (i ? 0 : 1) // Устанавливаем начальную нулевую непрозрачность для всех, кроме первой панели
  });

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: ".section-scroll-slides",
      start: "top top",
      end: () => "+=" + 100 * panels.length + "%",
      pin: true,
      scrub: 1
    }
  });

  panels.forEach((panel, index) => {
    if (index) {
      tl.to(
        panels[index - 1], // Предыдущая панель
        {
          opacity: 0, // Скрываем предыдущую панель (fade out)
          yPercent: -100,
          ease: "none"
        },
        "+=0.15" // Задержка перед следующей анимацией
      );
      tl.to(
        panel, // Текущая панель
        {
          opacity: 1, // Делаем текущую панель видимой (fade in)
          yPercent: 0,
          ease: "none"
        },
        "-=0.15" // Перекрываем предыдущую анимацию (fade out)
      );
      if (contentoEls[index]) {
        tl.call(toggleReveal, [index], "<+=0.125");
      }
    } else {
      tl.call(toggleReveal, [index], 0.125);
    }
  });
});
document.addEventListener("DOMContentLoaded", () => {
  const sections = document.querySelectorAll(".special__section");
  const images = gsap.utils.toArray(".bg__all-wrap img");
  images[0].classList.add("active");

  ScrollTrigger.create({
    trigger: ".scroll-about-fade",
    start: "top top",
    end: () => `+=${100 * (sections.length - 1)}vh`,
    scrub: 1,
    pin: true,
    onUpdate: (scrollTrigger) => {
      const newIndex = Math.floor(
        scrollTrigger.progress * (sections.length - 1)
      );

      sections.forEach((section, index) => {
        if (index === newIndex) {
          section.style.display = "flex";
        } else {
          section.style.display = "none";
        }
      });

      images.forEach((image, index) => {
        if (index === newIndex) {
          image.classList.add("active");
        } else {
          image.classList.remove("active");
        }
      });
    },
  });

  const toggleActive = (index) => {
    const next = images[index];
    const prev = images[index - 1];
    next && next.classList.toggle("active");
    prev && prev.classList.toggle("active");

    const activeSection = sections[index];
    if (activeSection) {
      const elementsToAnimate = activeSection.querySelectorAll(".fade-in");

      gsap.to(elementsToAnimate, {
        opacity: 1,
        y: 0,
        duration: 0.5,
        stagger: 0.2,
      });
    }
  };

  sections.forEach((section, index) => {
    tl.to(
      section,
      {
        y: `-${100 * index}vh`,
        opacity: 1,
        duration: 1,
        ease: "none",
      },
      index === 0 ? 0 : "-=0.1"
    );

    if (index === 0) {
      tl.call(toggleActive, [index]);
    } else {
      tl.call(toggleActive, [index], "<+=0.125");
    }
  });
});