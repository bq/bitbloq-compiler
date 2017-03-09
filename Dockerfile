FROM kaezarrex/python-nodejs
MAINTAINER Álvaro Sánchez <alvaro.sanchez@bq.com>

RUN sudo python -c "$(curl -fsSL https://raw.githubusercontent.com/platformio/platformio/master/scripts/get-platformio.py)"
#RUN rm /usr/local/lib/python2.7/dist-packages/platformio/builder/tools/piomisc.py
#COPY piomisc.py /usr/local/lib/python2.7/dist-packages/platformio/builder/tools/
RUN mkdir /home/platformio
ENV PLATFORMIO_HOME_DIR '/home/platformio/pioWS'
RUN mkdir -p /home/platformio/pioWS
COPY pioWS /home/platformio/pioWS
RUN python --version
RUN sudo platformio platforms install atmelavr --with-package framework-arduinoavr
COPY bitbloq-compiler/ /home/compiler/
CMD sudo node /home/compiler/index.js
