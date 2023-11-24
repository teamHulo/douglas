$(() => {
    console.error("Script loaded");
    gsap.registerPlugin(ScrollTrigger);
    const createAnimation = (trigger, xPercentValue) => {
        return gsap.timeline({
            scrollTrigger: {
                trigger: trigger,
                pin: true,
                start: "top 70%",
                end: "bottom bottom",
                pinSpacing: false,
                scrub:2,
                
               
            },
        }).to(trigger, { xPercent: xPercentValue ,ease: "none" },"+=0.15");
    };

    const triggersLeft = document.querySelectorAll(".image-animate-left");
    const triggersRight = document.querySelectorAll(".image-animate-right");

    triggersLeft.forEach((trigger) => createAnimation(trigger, 100));
    triggersRight.forEach((trigger) => createAnimation(trigger, -100));

    console.error("Animation timeline created");
});