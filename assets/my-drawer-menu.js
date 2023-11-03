$(() => {
  $(".my-drawer-menu .drawer-menu__close-wrapper button, .my-overlay").on(
    "click",
    function () {
      $(".my-drawer-menu .my-drawer-menu__inner").removeClass("active");
      $(".my-drawer-menu ul").removeClass("active");
      $(".my-drawer-menu").removeClass("active");
      $("body").removeClass("no-scroll");
    }
  );

  $(".first-link-menu").on("mouseenter", function () {
    let atr = $(this).find("span").attr("data-title");
    $(".first-link-menu").removeClass('active');
    $(this).addClass('active');
    $(".my-drawer-menu__list-second-level ul").removeClass("active");
    if (atr != "" && atr != undefined && atr != null) {
      $(
        '.my-drawer-menu__list-second-level ul[data-title="' + atr + '"]'
      ).addClass("active");
    }
  });
  $(".click-menu").on("click, mouseenter", function () {
    let atr = $(this).attr("data-title");

    $(".my-drawer-menu__list-second-level ul").removeClass("active");
    $(
      '.my-drawer-menu__list-second-level ul[data-title="' + atr + '"]'
    ).addClass("active");
  });
  $(".header__icon-menu").on("click", function () {
    $(".my-drawer-menu").addClass("active");
    $("body").addClass("no-scroll");
    $(".my-drawer-menu .my-drawer-menu__inner").addClass("active");
  });
});
