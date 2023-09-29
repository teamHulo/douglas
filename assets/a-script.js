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
  contentoEls[0].classList.add('revealed');
  const toggleReveal = (index) => {
    const next = contentoEls[index];
    const prev = contentoEls[index - 1];
    next && next.classList.toggle("revealed");
    prev && prev.classList.toggle("revealed");
  };
  
  gsap.set(panels, {
    yPercent: (i) => (i ? 100 : 0),
    opacity: (i) => (i ? 0 : 1), // Устанавливаем начальную нулевую непрозрачность для всех, кроме первой панели
  });
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: ".section-scroll-slides",
      start: "top top",
      end: () => "+=" + 100 * panels.length + "%",
      pin: true,
      scrub: 1,
      onLeave: ({ progress, direction }) => {
        console.log(progress, direction);
        if (progress <= 0 && direction === 0) {
          contentoEls[0].classList.add('revealed');
        }
      },
     
    },
  });

  panels.forEach((panel, index) => {
   
    if (index) {
      
      tl.to(
        panels[index - 1], // Предыдущая панель
        {
          opacity: 0, // Скрываем предыдущую панель (fade out)
          yPercent: -100,
          ease: "none",
          onComplete: () => {
            console.log(index);
            if (index !== 0) {
              contentoEls[0].classList.remove('revealed');
            }
          },
        },
        "+=0.15" // Задержка перед следующей анимацией
      );
      tl.to(
        panel, // Текущая панель
        {
          opacity: 1, // Делаем текущую панель видимой (fade in)
          yPercent: 0,
          ease: "none",
          onComplete: () => {
            console.log(index);
            if (index === 0) {
              contentoEls[0].classList.add('revealed');
            }
          },
        },
        "-=0.15" // Перекрываем предыдущую анимацию (fade out)
      );
     
      if (contentoEls[index]) {
        tl.call(toggleReveal, [index], "<+=0.125");
      }
    } else {
      //tl.call(toggleReveal, [index], 0.125);
    }
  });
});



















/*document.addEventListener("DOMContentLoaded", () => {
  gsap.registerPlugin(ScrollTrigger);

  const container = document.querySelector(".scroll-about_wrap-body");
  const sections = gsap.utils.toArray(".special__section");
  const windowHeight = window.innerHeight;
  const images = gsap.utils.toArray(".bg__all-wrap img");
  const totalSectionsHeight = sections.reduce(
    (totalHeight, section) => totalHeight + section.clientHeight,
    0
  );

  const toggleActive = (index) => {
    $('.bg__all-wrap img').eq(index).addClass('active');
    $('.bg__all-wrap img').eq(index - 1).removeClass('active');
  };

  toggleActive(0);

  let animateStart = true;
  let scrollDirection = 1; // Направление скролла (1 - вниз, -1 - вверх)

  function animateScroll() {
    if (animateStart) {
      const currentY = gsap.getProperty(container, "y");
      let newY = currentY - windowHeight * scrollDirection; // Учитываем направление скролла

      // Проверка на достижение нижней границы
      if (newY > 0) {
        newY = 0;
      }
      // Проверка на достижение верхней границы
      if (Math.abs(newY) > totalSectionsHeight - windowHeight) {
        newY = -(totalSectionsHeight - windowHeight);
      }

      if (newY !== currentY) {
        const indx = Math.abs(newY / windowHeight);
        console.log(indx);
        toggleActive(indx);
        gsap.to(container, {
          y: newY,
          duration: 1,
          ease: "power1.inOut",
          onStart: () => {
            animateStart = false;
            console.log("началась");
            $('body').css('overflow', 'hidden');
          },
          onComplete: () => {
            console.log("выполнилась");
            animateStart = true;
           $('body').css('overflow', 'auto');
          }
        });
      }
    }
  }

  ScrollTrigger.create({
    trigger: ".scroll-about-fade",
    start: "top top+=0",
    end: () => `bottom bottom-=${sections[sections.length - 1].clientHeight}`,
    scrub: 1,
    pin: true,
    onUpdate: (self) => {
      // Обновляем направление скролла на основе выполнения анимации ScrollTrigger
      if (self.direction === -1) {
        scrollDirection = -1;
      } else if (self.direction === 1) {
        scrollDirection = 1;
      }
      
      if (animateStart) {
        animateScroll();
      }
    }
  });

  // Обработчик события прокрутки страницы
  window.addEventListener("wheel", (event) => {
    if (event.deltaY < 0) {
      // Прокрутка вверх
      scrollDirection = -1;
    } else if (event.deltaY > 0) {
      // Прокрутка вниз
      scrollDirection = 1;
    }
  });
});*/
/*document.addEventListener("DOMContentLoaded", () => {
  gsap.registerPlugin(ScrollTrigger);

  const container = document.querySelector(".scroll-about_wrap-body");
  const sections = gsap.utils.toArray(".special__section");
  const windowHeight = window.innerHeight;
  const images = gsap.utils.toArray(".bg__all-wrap img");
  const totalSectionsHeight = sections.reduce(
    (totalHeight, section) => totalHeight + section.clientHeight,
    0
  );

  let indx = 0; // Индекс текущего изображения
  const toggleActive = (index) => {
    $('.bg__all-wrap img').removeClass('active'); // Убираем класс "active" у всех изображений
    $('.bg__all-wrap img').eq(index).addClass('active'); // Добавляем класс "active" только к текущему изображению
  };
  const initialScrollAboutWrapY = gsap.getProperty(container, "y");
  toggleActive(indx);

  let animateStart = true;
  let scrollDirection = 1; // Направление скролла (1 - вниз, -1 - вверх)
  function animateScroll() {
    
      const currentY = gsap.getProperty(container, "y");
      let newY = currentY - windowHeight * scrollDirection; // Учитываем направление скролла

      // Проверка на достижение нижней границы
      if (newY > 0) {
        newY = 0;
      }
      // Проверка на достижение верхней границы
      if (Math.abs(newY) > totalSectionsHeight - windowHeight) {
        newY = -(totalSectionsHeight - windowHeight);
      }

      if (newY !== currentY) {
        const newIndx = Math.abs(newY / windowHeight);
        if (newIndx !== indx) {
          indx = newIndx; // Обновляем индекс при изменении изображения
          toggleActive(indx);
        }
      }  
        gsap.to(container, {
          y: newY,
          duration: 1,
          ease: "power1.inOut",
          onStart: () => {
            
            console.log("началась");
           // $('body').css('overflow', 'hidden');
          },
          onComplete: () => {
            console.log("выполнилась");
            animateStart = true;
           // $('body').css('overflow', 'auto');
          }
        });
      
    
  }
  console.log(sections[sections.length - 1].clientHeight);
  ScrollTrigger.create({
    trigger: ".scroll-about-fade",
    start: "top top+=0",
    end: () => {
      const currentY = gsap.getProperty(container, "y");
      const endY = currentY - initialScrollAboutWrapY;
      return `bottom bottom-=${container.clientHeight - window.innerHeight - endY}`;
    },
    scrub: 1,
    pin: true,
    markers: true,
    onEnter: () => {
      // Код, который должен выполниться при завершении анимации
      console.log("Анимация завершена");
    },
    onUpdate: (self) => {
      if (self.direction === -1) {
        scrollDirection = -1;
      } else if (self.direction === 1) {
        scrollDirection = 1;
      }
  
      if (animateStart) {
        animateStart = false;
        animateScroll();
      }
    }
  });
  // Обработчик события прокрутки страницы
  window.addEventListener("wheel", (event) => {
    if (event.deltaY < 0) {
      // Прокрутка вверх
      scrollDirection = -1;
    } else if (event.deltaY > 0) {
      // Прокрутка вниз
      scrollDirection = 1;
    }
  });
});*/

document.addEventListener("DOMContentLoaded", () => {
  
  gsap.registerPlugin(ScrollTrigger);

  const container = document.querySelector(".scroll-about_wrap-body");
  const sections = gsap.utils.toArray(".special__section");
  const windowHeight = window.innerHeight;
  const images = gsap.utils.toArray(".bg__all-wrap img");
  if($('.scroll-about-fade').length > 0 ){
    const totalSectionsHeight = sections.reduce(
      (totalHeight, section) => totalHeight + section.clientHeight,
      0
    );
  
    let indx = 0; // Индекс текущего изображения
    const toggleActive = (index) => {
      $(".bg__all-wrap img").removeClass("active"); // Убираем класс "active" у всех изображений
      $(".bg__all-wrap img").eq(index).addClass("active"); // Добавляем класс "active" только к текущему изображению
    };
  
    toggleActive(indx);
  
    let animateStart = true;
    let scrollDirection = 1; // Направление скролла (1 - вниз, -1 - вверх)
  
    function animateScroll() {
      const currentY = gsap.getProperty(container, "y");
      let newY = currentY - windowHeight * scrollDirection; // Учитываем направление скролла
  
      // Проверка на достижение нижней границы
      if (newY > 0) {
        newY = 0;
      }
      // Проверка на достижение верхней границы
      if (Math.abs(newY) > totalSectionsHeight - windowHeight) {
        newY = -(totalSectionsHeight - windowHeight);
      }
  
      if (newY !== currentY) {
        const newIndx = Math.abs(newY / windowHeight);
        if (newIndx !== indx) {
          indx = newIndx; // Обновляем индекс при изменении изображения
          toggleActive(indx);
        }
      }
      gsap.to(container, {
        y: newY,
        duration: 1,
        ease: "power1.inOut",
        onStart: () => {
          console.log("началась");
          $("body").css("overflow", "hidden");
        },
        onComplete: () => {
          console.log("выполнилась");
          animateStart = true;
          $("body").css("overflow", "auto");
        },
      });
    }
  
    
  
  
  
  
  
    ScrollTrigger.create({
      trigger: ".scroll-about-fade",
      start: "top top+=0",
      end: () => `bottom bottom-=${sections[sections.length - 3].clientHeight}`,
      scrub: 1,
      pin: true,
      onUpdate: (self) => {
        // Обновляем направление скролла на основе выполнения анимации ScrollTrigger
        if (self.direction === -1) {
          scrollDirection = -1;
        } else if (self.direction === 1) {
          scrollDirection = 1;
        }
  
        if (animateStart) {
          animateStart = false;
          animateScroll();
        }
      },
    });
  
    // Обработчик события прокрутки страницы
    window.addEventListener("wheel", (event) => {
      if (event.deltaY < 0) {
        // Прокрутка вверх
        scrollDirection = -1;
      } else if (event.deltaY > 0) {
        // Прокрутка вниз
        scrollDirection = 1;
      }
    });


  }
  
});



