$(() => {


    $('.my-drawer-menu .drawer-menu__close-wrapper button').on('click', function(){

      $('.my-drawer-menu .my-drawer-menu__inner').removeClass('active');
       $('.my-drawer-menu ul').removeClass('active');
       setTimeout(function() {
        $('.my-drawer-menu').css('display', 'none');
         $('body').removeClass('no-scroll');
         //$('.no-scroll').css('padding-right', `0px`);
      }, 500);
    });
    $('.click-menu').on('click', function(){
      let atr = $(this).attr('data-title');
      
      $('.my-drawer-menu__list-second-level ul').removeClass('active');
      $('.my-drawer-menu__list-second-level ul[data-title="'+ atr +'"]').addClass('active');

      
    });
    $('.header__icon-menu').on('click', function(){
        //let scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        $('.my-drawer-menu').css('display', 'block');
        $('body').addClass('no-scroll');
       // $('.no-scroll').css('padding-right', `${scrollbarWidth}px`);
        setTimeout(function() {
           $('.my-drawer-menu .my-drawer-menu__inner').addClass('active');
        }, 200);
        //$('.my-drawer-menu .my-drawer-menu__inner').addClass('active');
    });
});
