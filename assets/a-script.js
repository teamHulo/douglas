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
  const panels = gsap.utils.toArray(".panel");
  if(panels.length > 0){
    gsap.registerPlugin(ScrollTrigger);

 
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
  }
 
});



$(() => {
  const lengthSections = document.querySelectorAll('.special__section').length;
  if(lengthSections > 0 ){
    gsap.registerPlugin(ScrollTrigger);
    const headerHeight = document.querySelector('header').clientHeight;
    const windowHeight = window.innerHeight;
    const announcementBars = document.querySelectorAll('.announcement-bar');
    const announcementHeight = announcementBars.length > 0 ? announcementBars[0].clientHeight : 0;
    const shift = announcementHeight + headerHeight;
   
    console.log(shift);
  
    const toggleActive = (index) => {
      $(".bg__all-wrap img").removeClass("active");
      $(".bg__all-wrap img").eq(index).addClass("active");
    };
  
    function disableScroll() {
      document.addEventListener('wheel', preventDefault, { passive: false });
      document.addEventListener('touchmove', preventDefault, { passive: false });
    }
  
    function enableScroll() {
      document.removeEventListener('wheel', preventDefault);
      document.removeEventListener('touchmove', preventDefault);
    }
  
    function preventDefault(event) {
      event.preventDefault();
    }
  
    function goToSection(sectionIndex) {
      isReady = false; // Отключаем скроллинг перед началом анимации
      disableScroll(); // Отключаем скроллинг через обработчики событий
      gsap.to(window, {
        scrollTo: { y: sectionIndex * windowHeight + shift, autoKill: false },
        duration: 1,
        onComplete: () => {
          indx = sectionIndex;
          gsap.delayedCall(0.3, () => {
            isReady = true; // Включаем скроллинг после завершения анимации
            enableScroll(); // Включаем скроллинг через обработчики событий
          });
        },
      });
    }
    let startImageIndex = Math.floor((window.scrollY + shift) / windowHeight);
    let indx = 0;
    toggleActive(startImageIndex);
    let isReady = false;
  
    ScrollTrigger.create({
      trigger: '.scroll-about-fade',
      pin: '.scroll-about-fade .bg__all',
      start: "top",
      end: 'bottom bottom',
    });
  
    ScrollTrigger.create({
      trigger: '.scroll-about__wrap',
      top: "top top",
      end: "bottom bottom",
      onEnter: () => {
        isReady = true;
      },
      onLeave: () => {
        isReady = false;
        enableScroll();
      },
      onEnterBack: () => {
        isReady = true;
      },
      onUpdate: (self) => {
        if (isReady) {
          const newIndex = Math.floor((window.scrollY + shift) / windowHeight) + self.direction;
          console.log(newIndex);
          if (newIndex >= lengthSections) {
            newIndex = lengthSections - 1;
          }
          goToSection(newIndex);
          isReady = false;
          newIndex <= 0 ? toggleActive(0) : toggleActive(newIndex);
        }
      }
    });
  }
});
