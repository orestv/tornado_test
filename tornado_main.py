import os
import concurrent.futures.thread

import tornado
import tornado.ioloop
import tornado.web

from tornado.web import url
import handlers

ROOT = os.path.curdir


class Application(tornado.web.Application):
    _executor = concurrent.futures.thread.ThreadPoolExecutor(8)

    @property
    def executor(self):
        """
        :rtype: concurrent.futures.thread.ThreadPoolExecutor
        """
        return self._executor


def make_app():
    return Application([
        url(r'/',  handlers.HelloHandler),
        url(r'/interact.ws', handlers.ActionHandler),
        url(r'/status.ws', handlers.TaskStatusHandler),
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