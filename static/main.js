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
        reflux: 'lib/bower_components/reflux/dist/reflux.min',
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
    'events'
], function($, reflux, React, bootstrap, components, events) {

    React.render(
        React.createElement(components.main),
        document.getElementById('content')
    );

    React.render(
        React.createElement(components.statusbar),
        document.getElementById('status-bar')
    );

    setTimeout(events.actions.buttonClickedAction, 2000);
});

