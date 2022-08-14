FROM python:3.10-slim-bullseye

ENV APP=/app
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONPATH="${PYTHONPATH}:$APP"
ENV DJANGO_SETTINGS_MODULE=babybuddy.settings.development

# in development this will be a volume
WORKDIR $APP

# for postgresql 12
RUN apt update
RUN apt install -y wget gnupg2 curl
RUN echo "deb http://apt.postgresql.org/pub/repos/apt buster-pgdg main" > /etc/apt/sources.list.d/pgdg.list
RUN wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
RUN apt update

# get the basic stuff insalled
RUN apt install -y bash git gcc inotify-tools libffi-dev make musl-dev nodejs libssl-dev
RUN python3 -m pip install pipenv

COPY . $APP

RUN pipenv install --three

RUN echo "NODE Version:" && node --version
RUN echo "NPM Version:" && npm --version
RUN npm install -g gulp-cli
RUN npm install
# RUN gulp migrate
# RUN gulp createcachetable

ENV PATH="./node_modules/.bin:${PATH}"

CMD /app/node_modules/.bin/gulp runserver --ip 0.0.0.0:8000
