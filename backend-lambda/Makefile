.PHONY: build clean deploy test

build:
	GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -o bootstrap main.go
	zip function.zip bootstrap

clean:
	rm -f bootstrap function.zip

test:
	go test -v ./...

# Install dependencies
deps:
	go mod download
	go mod tidy

# Build for local testing (no zip)
build-local:
	go build -o bootstrap main.go
