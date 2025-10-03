

upload-conf:
	uplitmo httpd-conf-template.conf httpd-root/conf/httpd.conf

upload-static:
	uplitmo dist/ web1/static


generate-ts:
	npm run format
	npx tsc ./src/fronted/script.ts --outDir ./src/fronted/ --target ES6
	npx eslint src


upload-jar:
	./gradlew build
	uplitmo build/libs/WebLaba01-1.0-SNAPSHOT.jar httpd-root/fcgi-bin/server.jar


upload-all: upload-static upload-jar upload-conf



#httpd -f ~/httpd-root/conf/httpd.conf -k start;java -DFCGI_PORT=33334 -jar httpd-root/fcgi-bin/server.jar
#java -DFCGI_PORT=33334 -jar httpd-root/fcgi-bin/server.jar
# sshpass -e ssh -p 2222 -L 8080:localhost:33333 s467740@helios.cs.ifmo.ru