import os

import tornado
import tornado.ioloop
import tornado.web

from tornado.web import url
import handlers

ROOT = os.path.curdir


def make_app():
    return tornado.web.Application([
        url(r'/',  handlers.HelloHandler),
    ],
        static_path=os.path.join(ROOT, 'static'),
        template_path=os.path.join(ROOT, 'templates'),
        debug=True
    )


def main():

    app = make_app()
    app.listen(8888)

    tornado.ioloop.IOLoop.current().start()


if __name__ == '__main__':
    main()