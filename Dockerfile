FROM beevelop/nodejs-python
MAINTAINER Álvaro Sánchez <alvaro.sanchez@bq.com>

RUN python -c "$(curl -fsSL https://raw.githubusercontent.com/platformio/platformio/v3.0.1/scripts/get-platformio.py)"
RUN rm /usr/local/lib/python2.7/dist-packages/platformio/builder/tools/piomisc.py
COPY piomisc.py /usr/local/lib/python2.7/dist-packages/platformio/builder/tools/
RUN mkdir /home/platformio
ENV PLATFORMIO_HOME_DIR '/home/platformio/pioWS'
RUN mkdir -p /home/platformio/pioWS
COPY pioWS /home/platformio/pioWS
COPY bitbloq-compiler/ /home/compiler/
CMD node /home/compiler/index.js
