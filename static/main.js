/**
 * Created by seth on 6/6/15.
 */

requirejs.config({
    paths: {
        // the left side is the module ID,
        // the right side is the path to
        // the jQuery file, relative to baseUrl.
        // Also, the path should NOT include
        // the '.js' file extension. This example
        // is using jQuery 1.9.0 located at
        // js/lib/jquery-1.9.0.js, relative to
        // the HTML page.
        jquery: 'lib/bower_components/jquery/dist/jquery.min',
        reflux: 'lib/bower_components/reflux/dist/reflux',
        react: 'lib/bower_components/react/react',
        bootstrap: 'lib/bower_components/bootstrap/dist/js/bootstrap.min'
    }
});


require([
    'jquery',
    'reflux',
    'react',
    'bootstrap',
    'components',
    'events_interaction',
    'events_statusbar'
], function($, reflux, React, bootstrap, components, events_interaction, events_statusbar) {

    React.render(
        React.createElement(components.vmList),
        document.getElementById('vmList')
    );

    React.render(
        React.createElement(components.statusbar),
        document.getElementById('statusbar')
    );

    React.render(
        React.createElement(components.navbar),
        document.getElementById('navbar')
    )

});

