import * as React from "react";
import logo from "./logo.png";
import {
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
} from "@material-ui/core";
import "./App.css";

function App() {
  const [type, setType] = React.useState("");
  const [figma_id, setFigmaID] = React.useState("");

  const handleTextFieldChange = (event) => {
    setFigmaID(event.target.value);
  };

  const handleSelectChange = (event) => {
    setType(event.target.value);
  };

  const handleGenerate = (event) => {
    window.location.href = `http://localhost:4567/${type}/${figma_id}`;
  };

  return (
    <div className="App">
      <header className="App-header">
        <img alt="" src={logo} className="App-logo" />
        <p>Figma Web</p>
      </header>
      <body className="App-body">
        <div>
          <TextField
            sx={{
              m: 2,
              fontSize: 60,
              width: { sm: 200, md: 300 },
              "& label": { color: "white" },
              "& .MuiOutlinedInput-root": {
                "& fieldset": {
                  borderColor: "white",
                },
              },
            }}
            InputProps={{
              style: {
                fontSize: 25,
                color: "white",
              },
            }}
            id="textfield"
            label="Figma ID"
            variant="outlined"
            onChange={handleTextFieldChange}
          />
          <FormControl
            sx={{
              m: 2,
              width: { sm: 200, md: 300 },
              "& .MuiOutlinedInput-root": {
                "& fieldset": {
                  borderColor: "white",
                },
              },
            }}
          >
            <InputLabel
              sx={{
                fontSize: 15,
                color: "white",
              }}
              id="select-label"
              variant="outlined"
            >
              File Type
            </InputLabel>
            <Select
              labelId="select-label"
              id="select"
              sx={{
                fontSize: 25,
                color: "white",
              }}
              value={type}
              label="File Type"
              onChange={handleSelectChange}
            >
              <MenuItem value={"raw"}>HTML/CSS</MenuItem>
              <MenuItem value={"react"}>React</MenuItem>
            </Select>
          </FormControl>
        </div>
        <div>
          <Button
            sx={{
              fontSize: 20,
              m: 2,
              width: { sm: 300, md: 200 },
            }}
            variant="contained"
            onClick={handleGenerate}
          >
            Generate
          </Button>
        </div>
      </body>
      <foot className="App-footer">
        <p> Reference link: </p>
      </foot>
    </div>
  );
}

export default App;
