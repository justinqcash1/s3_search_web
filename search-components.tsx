import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { Progress } from "./ui/progress";

interface CredentialsFormProps {
  awsAccessKey: string;
  setAwsAccessKey: (value: string) => void;
  awsSecretKey: string;
  setAwsSecretKey: (value: string) => void;
  awsRegion: string;
  setAwsRegion: (value: string) => void;
  showPassword: boolean;
  setShowPassword: (value: boolean) => void;
  saveCredentials: boolean;
  setSaveCredentials: (value: boolean) => void;
}

export function CredentialsForm({
  awsAccessKey,
  setAwsAccessKey,
  awsSecretKey,
  setAwsSecretKey,
  awsRegion,
  setAwsRegion,
  showPassword,
  setShowPassword,
  saveCredentials,
  setSaveCredentials
}: CredentialsFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>AWS Credentials</CardTitle>
        <CardDescription>
          Enter your AWS credentials to connect to S3
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="access-key">AWS Access Key ID</Label>
          <Input 
            id="access-key" 
            value={awsAccessKey}
            onChange={(e) => setAwsAccessKey(e.target.value)}
            placeholder="Enter your AWS Access Key ID" 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="secret-key">AWS Secret Access Key</Label>
          <Input 
            id="secret-key" 
            type={showPassword ? "text" : "password"}
            value={awsSecretKey}
            onChange={(e) => setAwsSecretKey(e.target.value)}
            placeholder="Enter your AWS Secret Access Key" 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="region">AWS Region</Label>
          <Input 
            id="region" 
            value={awsRegion}
            onChange={(e) => setAwsRegion(e.target.value)}
            placeholder="us-east-1" 
          />
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="save-creds" 
            checked={saveCredentials}
            onCheckedChange={(checked) => setSaveCredentials(checked as boolean)}
          />
          <Label htmlFor="save-creds">Save credentials for future use</Label>
        </div>
      </CardContent>
    </Card>
  );
}

interface BucketFormProps {
  bucketName: string;
  setBucketName: (value: string) => void;
  prefix: string;
  setPrefix: (value: string) => void;
  zipPassword: string;
  setZipPassword: (value: string) => void;
  showPassword: boolean;
  setShowPassword: (value: boolean) => void;
}

export function BucketForm({
  bucketName,
  setBucketName,
  prefix,
  setPrefix,
  zipPassword,
  setZipPassword,
  showPassword,
  setShowPassword
}: BucketFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>S3 Bucket Configuration</CardTitle>
        <CardDescription>
          Specify the S3 bucket to search
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="bucket-name">Bucket Name</Label>
          <Input 
            id="bucket-name" 
            value={bucketName}
            onChange={(e) => setBucketName(e.target.value)}
            placeholder="Enter your S3 bucket name" 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="prefix">Prefix (optional)</Label>
          <Input 
            id="prefix" 
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
            placeholder="Enter a prefix to limit the search scope" 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="zip-password">Zip Password</Label>
          <Input 
            id="zip-password" 
            type={showPassword ? "text" : "password"}
            value={zipPassword}
            onChange={(e) => setZipPassword(e.target.value)}
            placeholder="Enter zip file password" 
          />
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="show-password" 
            checked={showPassword}
            onCheckedChange={(checked) => setShowPassword(checked as boolean)}
          />
          <Label htmlFor="show-password">Show password</Label>
        </div>
      </CardContent>
    </Card>
  );
}

interface IdentifiersFormProps {
  identifiers: string;
  setIdentifiers: (value: string) => void;
  idFormat: string;
  setIdFormat: (value: string) => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function IdentifiersForm({
  identifiers,
  setIdentifiers,
  idFormat,
  setIdFormat,
  handleFileUpload
}: IdentifiersFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Identifiers List</CardTitle>
        <CardDescription>
          Upload or enter the identifiers to search for
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="identifiers-file">Upload Identifiers File</Label>
          <Input 
            id="identifiers-file" 
            type="file"
            accept=".txt,.csv"
            onChange={handleFileUpload}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="identifiers-text">Or Enter Identifiers Directly</Label>
          <textarea 
            id="identifiers-text"
            className="w-full min-h-[200px] p-2 border rounded-md"
            value={identifiers}
            onChange={(e) => setIdentifiers(e.target.value)}
            placeholder="Enter identifiers, one per line"
          />
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <input 
              type="radio" 
              id="format-line" 
              name="id-format"
              checked={idFormat === "line"}
              onChange={() => setIdFormat("line")}
            />
            <Label htmlFor="format-line">One per line</Label>
          </div>
          <div className="flex items-center space-x-2">
            <input 
              type="radio" 
              id="format-csv" 
              name="id-format"
              checked={idFormat === "csv"}
              onChange={() => setIdFormat("csv")}
            />
            <Label htmlFor="format-csv">CSV</Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ResultsViewProps {
  status: string;
  progress: number;
  results: string[];
  isSearching: boolean;
  handleSearch: () => void;
  handleStop: () => void;
}

export function ResultsView({
  status,
  progress,
  results,
  isSearching,
  handleSearch,
  handleStop
}: ResultsViewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Search Results</CardTitle>
        <CardDescription>
          View and download search results
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between mb-2">
            <Label>Status: {status}</Label>
            <div className="text-sm">{progress}%</div>
          </div>
          <Progress value={progress} className="w-full" />
        </div>
        
        <div className="flex space-x-4">
          <Button 
            onClick={handleSearch}
            disabled={isSearching}
          >
            Start Search
          </Button>
          <Button 
            variant="outline"
            onClick={handleStop}
            disabled={!isSearching}
          >
            Stop
          </Button>
          <Button 
            variant="outline"
            disabled={results.length === 0}
            onClick={() => {
              const csv = "Results\n" + results.join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "search_results.csv";
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            }}
          >
            Download Results
          </Button>
        </div>
        
        <div className="border rounded-md p-4 min-h-[300px] max-h-[500px] overflow-y-auto">
          {results.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No results yet. Start a search to see results here.
            </div>
          ) : (
            <ul className="space-y-2">
              {results.map((result, index) => (
                <li key={index} className="border-b pb-2">{result}</li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
