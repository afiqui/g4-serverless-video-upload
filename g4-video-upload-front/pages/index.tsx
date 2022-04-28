import {
  Spinner,
  Input,
  Flex,
  FormControl,
  Button,
  useToast,
  Progress,
  Center,
  Heading,
} from "@chakra-ui/react";
import axios from "axios";
import { useRouter } from "next/router";
import { ChangeEventHandler, useEffect, useState } from "react";
import { UiFileInputButton } from "../components/FileUpload";

const AuthEmail = () => {
  const { reload } = useRouter();
  const [email, set_email] = useState<string>("");

  return (
    <>
      <Heading size="md">Adicione um email para enviar o video</Heading>
      <Flex
        as="form"
        onSubmit={(event) => {
          event.preventDefault();
          localStorage.setItem("email", email);
          reload();
        }}
      >
        <FormControl>
          <Input
            value={email}
            onChange={(event) => set_email(event.target.value)}
          />
        </FormControl>
        <Button type="submit">Entrar</Button>
      </Flex>
    </>
  );
};

const Upload = ({ email }: { email: string }) => {
  const toast = useToast();
  const { reload } = useRouter();

  const [progress, set_progress] = useState(0);

  const onChange = async (event: any) => {
    set_progress(0);

    axios
      .get(
        `https://e1mvw8dhtk.execute-api.us-east-1.amazonaws.com/dev/getS3PresignedUrl?email=${email}`
      )
      .then(({ data: { url } }: any) => {
        const config = {
          headers: { "content-type": "video/mp4" },
          onUploadProgress: (progress: any) => {
            set_progress(Math.round((progress.loaded * 100) / progress.total));
          },
        };

        axios
          .put(url, event?.target?.files[0], config)
          .then(() => {
            toast({
              title: "Video enviado!",
              description: "Você receberá o link por email em breve",
              status: "success",
              isClosable: true,
              duration: 5000,
            });
          })
          .catch((err: any) => {
            set_progress(0);
            toast({
              title: "Error!",
              description: "Erro inesperado",
              status: "error",
              isClosable: true,
              duration: 5000,
            });
          });
      })
      .catch((err: any) => {
        set_progress(0);
        toast({
          title: "Error!",
          description: "Erro inesperado",
          status: "error",
          isClosable: true,
          duration: 5000,
        });
      });
  };

  return (
    <>
      <Input type="file" placeholder="Selecione o vídeo" accept="video/mp4" onChange={onChange} />
      <Button
        onClick={() => {
          localStorage.setItem("email", "");
          reload();
        }}
      >
        Sair
      </Button>
      {progress > 0 && <Progress value={progress} />}
    </>
  );
};

const IndexPage = () => {
  const [email, set_email] = useState<string>();
  useEffect(() => {
    const emai = localStorage.getItem("email");
    if (!!emai) set_email(emai);
  }, []);

  return (
    <Flex justify="center" align="center" direction="column" w="full" h="screen">

      <Heading size="lg">Upload de Videos</Heading>

      <Flex w={500} direction="column" justify="space-evenly" shadow="md">
        {!email && <AuthEmail />}
        {email && <Upload email={email} />}
      </Flex>

    </Flex>
  );
};

export default IndexPage;
