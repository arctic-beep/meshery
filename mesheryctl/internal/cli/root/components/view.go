// Copyright 2024 Meshery Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package components

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"github.com/meshery/meshery/mesheryctl/internal/cli/pkg/api"
	"github.com/meshery/meshery/mesheryctl/pkg/utils"
	"github.com/meshery/meshery/mesheryctl/pkg/utils/format"
	"github.com/meshery/meshery/server/models"
	"github.com/meshery/schemas/models/v1beta1/component"
	"github.com/pkg/errors"
	"github.com/spf13/cobra"
	"gopkg.in/yaml.v2"
)

// represents the mesheryctl component view [component-name] subcommand.
var viewComponentCmd = &cobra.Command{
	Use:   "view",
	Short: "View registered components",
	Long: `View a component registered in Meshery Server
Documentation for components can be found at https://docs.meshery.io/reference/mesheryctl/component/view`,
	Example: `
// View details of a specific component
mesheryctl component view [component-name]
	`,
	Args: func(_ *cobra.Command, args []string) error {
		const errMsg = "Usage: mesheryctl component view [component-name]\nRun 'mesheryctl component view --help' to see detailed help message"
		if len(args) == 0 {
			return utils.ErrInvalidArgument(fmt.Errorf("[component name] is required but not specified\n\n%s", errMsg))
		} else if len(args) > 1 {
			return utils.ErrInvalidArgument(fmt.Errorf("too many arguments specified\n\n%s", errMsg))
		}
		return nil
	},
	RunE: func(cmd *cobra.Command, args []string) error {

		outFormatFlag, _ := cmd.Flags().GetString("output-format")
		componentDefinition := args[0]
		saveFlag, _ = cmd.Flags().GetBool("save")

		urlPath := fmt.Sprintf("%s?search=%s&pagesize=all", componentApiPath, componentDefinition)

		componentResponse, err := api.Fetch[models.MeshmodelComponentsAPIResponse](urlPath)
		if err != nil {
			return err
		}

		var selectedComponent component.ComponentDefinition

		if componentResponse.Count == 0 {
			fmt.Println("No component(s) found for the given name: ", componentDefinition)
			return nil
		} else if componentResponse.Count == 1 {
			selectedComponent = componentResponse.Components[0] // Update the type of selectedModel
		} else {
			selectedComponent = selectComponentPrompt(componentResponse.Components)
		}

		var output []byte

		// user may pass flag in lower or upper case but we have to keep it lower
		// in order to make it consistent while checking output format
		outFormatFlag = strings.ToLower(outFormatFlag)
		if outFormatFlag != "json" && outFormatFlag != "yaml" {
			return errors.New("output-format choice is invalid or not provided, use [json|yaml]")
		}
		// Get the home directory of the user to save the output file
		homeDir, _ := os.UserHomeDir()
		componentString := strings.ReplaceAll(fmt.Sprintf("%v", selectedComponent.DisplayName), " ", "_")

		if outFormatFlag == "yaml" {
			if output, err = yaml.Marshal(selectedComponent); err != nil {
				return errors.Wrap(err, "failed to format output in YAML")
			}
			if saveFlag {
				fmt.Println("Saving output as YAML file")
				err = os.WriteFile(homeDir+"/.meshery/component_"+componentString+".yaml", output, 0666)
				if err != nil {
					return errors.Wrap(err, "failed to save output as YAML file")
				}
				fmt.Println("Output saved as YAML file in ~/.meshery/component_" + componentString + ".yaml")
			} else {
				fmt.Print(string(output))
			}
		} else if outFormatFlag == "json" {
			if saveFlag {
				fmt.Println("Saving output as JSON file")
				output, err = json.MarshalIndent(selectedComponent, "", "  ")
				if err != nil {
					return errors.Wrap(err, "failed to format output in JSON")
				}
				err = os.WriteFile(homeDir+"/.meshery/component_"+componentString+".json", output, 0666)
				if err != nil {
					return errors.Wrap(err, "failed to save output as JSON file")
				}
				fmt.Println("Output saved as JSON file in ~/.meshery/component_" + componentString + ".json")
				return nil
			}
			return format.OutputJson(selectedComponent)
		} else {
			return errors.New("output-format choice invalid, use [json|yaml]")
		}

		return nil
	},
}

func init() {
	// Add the new components commands to the ComponentsCmd
	viewComponentCmd.Flags().StringP("output-format", "o", "yaml", "(optional) format to display in [json|yaml]")
	viewComponentCmd.Flags().BoolP("save", "s", false, "(optional) save output as a JSON/YAML file")
}
