import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as stepfunctions from 'aws-cdk-lib/aws-stepfunctions';
import * as iam from 'aws-cdk-lib/aws-iam';


export class EcsRestartStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // State Machine Role
    const stateMachineRole = new iam.Role(this, 'StateMachineRole', {
      assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
    });

    stateMachineRole.addToPolicy(new iam.PolicyStatement({
      actions: ['ecs:ListClusters', 'ecs:ListTasks', 'ecs:DescribeTasks', 'ecs:StopTask'],
      resources: ['*'],
    }));

    const stateMachineDefinition = {
        "StartAt": "ListClusters",
        "States": {
          "ListClusters": {
            "Next": "MapCluster",
            "Parameters": {},
            "Resource": "arn:aws:states:::aws-sdk:ecs:listClusters",
            "ResultPath": "$.listClustersResult",
            "ResultSelector": {
              "ClusterArns.$": "$.ClusterArns"
            },
            "Type": "Task"
          },
          "MapCluster": {
            "End": true,
            "ItemProcessor": {
              "ProcessorConfig": {
                "Mode": "INLINE"
              },
              "StartAt": "ListRunningTasks",
              "States": {
                "CheckIfTasksExist": {
                  "Choices": [
                    {
                      "IsPresent": true,
                      "Next": "DescribeTasks",
                      "Variable": "$.Tasks.TaskArns[0]"
                    }
                  ],
                  "Default": "SkipTask",
                  "Type": "Choice"
                },
                "CheckImage": {
                  "Choices": [
                    {
                      "Next": "StopTask",
                      "StringEqualsPath": "$.detail.repository-name",
                      "Variable": "$.repoName.Name"
                    }
                  ],
                  "Default": "SkipTask",
                  "Type": "Choice"
                },
                "DescribeTasks": {
                  "Next": "ExtractRepoName",
                  "Parameters": {
                    "Cluster.$": "$.Cluster",
                    "Tasks.$": "$.Tasks.TaskArns"
                  },
                  "Resource": "arn:aws:states:::aws-sdk:ecs:describeTasks",
                  "ResultPath": "$.taskDetails",
                  "Type": "Task"
                },
                "ExtractRepoName": {
                  "Next": "CheckImage",
                  "Type": "Pass",
                  "Parameters": {
                    "Name.$": "States.ArrayGetItem(States.StringSplit(States.ArrayGetItem(States.StringSplit($.taskDetails.Tasks[0].Containers[0].Image, '/'), 1), ':'), 0)"
                  },
                  "ResultPath": "$.repoName"
                },
                "ListRunningTasks": {
                  "Next": "CheckIfTasksExist",
                  "Parameters": {
                    "Cluster.$": "$.Cluster",
                    "DesiredStatus": "RUNNING"
                  },
                  "Resource": "arn:aws:states:::aws-sdk:ecs:listTasks",
                  "ResultPath": "$.Tasks",
                  "Type": "Task"
                },
                "SkipTask": {
                  "End": true,
                  "Type": "Pass"
                },
                "StopTask": {
                  "End": true,
                  "Parameters": {
                    "Cluster.$": "$.Cluster",
                    "Reason": "Restarting task due to new ECR image deployment",
                    "Task.$": "$.Tasks.TaskArns[0]"
                  },
                  "Resource": "arn:aws:states:::aws-sdk:ecs:stopTask",
                  "Type": "Task"
                }
              }
            },
            "ItemsPath": "$.listClustersResult.ClusterArns",
            "MaxConcurrency": 1,
            "Parameters": {
              "Cluster.$": "$$.Map.Item.Value",
              "detail.$": "$.detail"
            },
            "ResultPath": "$",
            "Type": "Map"
          }
        }
    };

    const stateMachine = new stepfunctions.CfnStateMachine(this, 'StateMachine', {
      stateMachineName: 'ECS-Restart',
      definition: stateMachineDefinition,
      roleArn: stateMachineRole.roleArn,
    });

    const stateMachineL2 = stepfunctions.StateMachine.fromStateMachineArn(
      this,
      'StateMachineL2',
      stateMachine.attrArn,
    );

    // EventBridge Rule
    const ecrRepositoryNames = ['my-ecr-repo']; // Replace with your ECR repository names
    const rule = new events.Rule(this, 'Rule', {
      ruleName: 'ECRImageActionRule-'+ecrRepositoryNames[0],
      eventPattern: {
        source: ['aws.ecr'],
        detailType: ['ECR Image Action'],
        detail: {
          'action-type': ['PUSH'],
          'repository-name': ecrRepositoryNames,
        },
      },
    });

    rule.addTarget(new targets.SfnStateMachine(stateMachineL2));

  }
}
