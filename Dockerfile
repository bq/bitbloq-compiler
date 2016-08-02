FROM beevelop/nodejs-python
MAINTAINER Álvaro Sánchez <alvaro.sanchez@bq.com>

RUN python -c "$(curl -fsSL https://raw.githubusercontent.com/platformio/platformio/master/scripts/get-platformio.py)"
RUN mkdir /home/platformio
ENV PLATFORMIO_HOME_DIR '/home/platformio/pioWS'
RUN mkdir -p /home/platformio/pioWS
COPY pioWS /home/platformio/pioWS
COPY bitbloq-compiler/ /home/compiler/
CMD node /home/compiler/index.js
