module github.com/ssg-one/backend-lambda

go 1.25.4

require (
	github.com/aws/aws-lambda-go v1.47.0
	github.com/sifoncake/line-to-claude v0.0.0
)

require github.com/stretchr/testify v1.8.4 // indirect

replace github.com/sifoncake/line-to-claude => ../../line-to-claude
