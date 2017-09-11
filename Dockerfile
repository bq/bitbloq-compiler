FROM beevelop/nodejs-python
MAINTAINER Álvaro Sánchez <alvaro.sanchez@bq.com>

RUN python -m pip install --upgrade --force-reinstall pip
RUN pip install -U platformio
RUN mkdir /home/platformio
ENV PLATFORMIO_HOME_DIR '/home/platformio/pioWS'
RUN mkdir -p /home/platformio/pioWS
COPY pioWS /home/platformio/pioWS
RUN python --version
RUN platformio platforms install atmelavr --with-package framework-arduinoavr
COPY bitbloq-compiler/ /home/compiler/
CMD node /home/compiler/index.js
