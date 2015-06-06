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
        react: 'lib/bower_components/react/react.min',
        bootstrap: 'lib/bower_components/bootstrap/dist/js/bootstrap.min'
    }
});


require([
    //'lib/bower_components/reflux/dist/reflux.min',
    //'lib/bower_components/jquery/dist/jquery.min',
    //'lib/bower_components/react/react.min',
    'jquery',
    'reflux',
    'react',
    'bootstrap',
    'components'
]);

