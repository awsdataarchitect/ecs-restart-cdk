# Open-source repository to demo automation of ECS Task Restarts on ECR Image Push with AWS Step Functions and CDK

Learn by using AWS-CDK, how to implement Event-driven restart of ECS tasks using AWS Step Functions <> ECS Task SDK Integration + EventBridge (No Lambda Function needed)

#  Diagram
![Alt text](./ecs-restart-step-function.png?raw=true "Automation of ECS Task Restarts on ECR Image Push with AWS Step Functions and CDK")

For more details on how to deploy the infrastructure and the solution details, please refer to the [Blog Post](https://vivek-aws.medium.com/automating-ecs-task-restarts-on-ecr-image-push-with-aws-step-functions-and-cdk-b7e7acf9b3b7).


The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template
