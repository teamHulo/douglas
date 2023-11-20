$(() => {
    console.error("Script loaded");
    gsap.registerPlugin(ScrollTrigger);
    const createAnimation = (trigger, xPercentValue) => {
        return gsap.timeline({
            scrollTrigger: {
                trigger: trigger,
                pin: true,
                start: "top 60%",
                end: "bottom center",
                pinSpacing: false,
                scrub:3,
                markers:true,
                onUpdate : (self) => {
                    let progress = self.progress;
                    console.log(progress);
                }
            },
        }).to(trigger, { xPercent: xPercentValue, y: 0,ease: "none" },"+=0.15");
    };

    const triggersLeft = document.querySelectorAll(".image-animate-left");
    const triggersRight = document.querySelectorAll(".image-animate-right");

    triggersLeft.forEach((trigger) => createAnimation(trigger, 100));
    triggersRight.forEach((trigger) => createAnimation(trigger, -100));

    console.error("Animation timeline created");
});