console.log('main.js');

htmx.defineExtension('log', {
    onEvent: function (name, evt) {
            console.log('theme_switcher_btn clicked');
    }
});