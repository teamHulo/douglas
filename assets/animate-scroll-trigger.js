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
                scrub:3,
               
               
            },
        }).to(trigger, { xPercent: xPercentValue , yPercent:0, y:0  ,ease: "none" },"+=0.15").set(trigger, { y: 0 });
    };
    const createAnimation1 = (trigger, xPercentValue) => {
        return gsap.timeline({
            scrollTrigger: {
                trigger: trigger,
                pin: true,
                start: "top 25%",
                end: "bottom bottom",
                pinSpacing: false,
                scrub:3,
                
               
            },
        }).to(trigger, { xPercent: xPercentValue , yPercent:0, y:0  ,ease: "none" },"+=0.15").set(trigger, { y: 0 });
    };
    const triggersLeft = document.querySelectorAll(".image-animate-left");
    const triggersRight = document.querySelectorAll(".image-animate-right");
    const triggersStarLeft = document.querySelectorAll(".image-animate-left-start");
    const triggersStartRight = document.querySelectorAll(".image-animate-left-right");
    triggersLeft.forEach((trigger) => createAnimation(trigger, 100));
    triggersRight.forEach((trigger) => createAnimation(trigger, -100));
    triggersStarLeft.forEach((trigger) => createAnimation1(trigger, 100));
    triggersStartRight.forEach((trigger) => createAnimation1(trigger, -100));
    console.error("Animation timeline created");
});

