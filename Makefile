up:
	docker compose up

build:
	docker build --target production -t pocketbase-angular .

run:
	docker run --rm -p 127.0.0.1:8080:8080 -v pocketbase-preview:/pb/pb_data pocketbase-angular

check:
	cd front && npm ci && npm run test -- --watch=false && npm run build
