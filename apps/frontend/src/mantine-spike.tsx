import {
  AppShell,
  Avatar,
  Badge,
  Box,
  Burger,
  Button,
  Card,
  Center,
  createTheme,
  Group,
  MantineProvider,
  NavLink,
  Paper,
  Progress,
  RingProgress,
  ScrollArea,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from '@mantine/core';
import {useDisclosure} from '@mantine/hooks';
import {
  Bell,
  BookOpen,
  Boxes,
  ChevronRight,
  GraduationCap,
  Home,
  MessageCircle,
  Mic,
  Palette,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import {useState} from 'react';
import type {ReactElement} from 'react';

import './mantine-spike.css';

type SpikeMode = 'home' | 'teaching';

const theme = createTheme({
  primaryColor: 'violet',
  defaultRadius: 'md',
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
  headings: {fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif'},
  colors: {
    violet: [
      '#f6edff',
      '#e7d7fa',
      '#c9abed',
      '#aa7cde',
      '#9158d3',
      '#8141cc',
      '#782fc9',
      '#6722b2',
      '#5c1d9f',
      '#50168c',
    ],
  },
});

const navigation = [
  {id: 'home', label: 'Home', icon: Home},
  {id: 'teaching', label: 'Teaching', icon: GraduationCap},
  {id: 'project', label: 'Projets', icon: Boxes},
  {id: 'learning', label: 'Learning', icon: BookOpen},
  {id: 'theme', label: 'Theme Studio', icon: Palette},
] as const;

function HomePreview({onTeaching}: {onTeaching: () => void}): ReactElement {
  return (
    <Stack gap="lg">
      <Paper className="mf-hero" p="xl" radius="lg">
        <Group align="flex-start" justify="space-between">
          <Box>
            <Badge color="lime" variant="light">Contexte synchronisé</Badge>
            <Title mt="sm" order={1}>Bonjour Alexandre.</Title>
            <Text c="dimmed" maw={620} mt="xs">
              Tes classes sont calmes, un sujet demande une validation et le projet Ours d’Or
              peut reprendre exactement où tu l’as laissé.
            </Text>
          </Box>
          <RingProgress
            label={<Center><Text fw={800}>78%</Text></Center>}
            sections={[{value: 78, color: 'lime'}]}
            size={92}
            thickness={8}
          />
        </Group>
      </Paper>

      <SimpleGrid cols={{base: 1, sm: 3}}>
        {[
          ['Classes actives', '4', '1 vigilance'],
          ['Projets à reprendre', '7', '2 cette semaine'],
          ['Validations', '3', 'aucun blocage critique'],
        ].map(([label, value, detail]) => (
          <Card className="mf-card" key={label} padding="lg" radius="lg">
            <Text c="dimmed" size="xs" tt="uppercase" fw={800}>{label}</Text>
            <Title mt={6} order={2}>{value}</Title>
            <Text c="dimmed" size="sm">{detail}</Text>
          </Card>
        ))}
      </SimpleGrid>

      <SimpleGrid cols={{base: 1, md: 2}}>
        <Card className="mf-card mf-next" padding="xl" radius="lg">
          <Group justify="space-between">
            <Box>
              <Text c="lime.4" size="xs" tt="uppercase" fw={800}>Prochaine action</Text>
              <Title mt="xs" order={3}>Préparer la séance IA</Title>
              <Text c="dimmed" mt={6} size="sm">
                La classe 4CREA dispose du roster et des ressources nécessaires.
              </Text>
            </Box>
            <ThemeIcon color="lime" radius="xl" size={48} variant="light">
              <Sparkles size={22} />
            </ThemeIcon>
          </Group>
          <Button color="lime" fullWidth mt="xl" onClick={onTeaching} rightSection={<ChevronRight size={16} />}>
            Ouvrir Teaching
          </Button>
        </Card>

        <Card className="mf-card" padding="xl" radius="lg">
          <Group justify="space-between">
            <Box>
              <Text c="dimmed" size="xs" tt="uppercase" fw={800}>Projet actif</Text>
              <Title mt="xs" order={3}>Ours d’Or 2026</Title>
            </Box>
            <Badge color="yellow" variant="light">En progression</Badge>
          </Group>
          <Progress color="yellow" mt="xl" radius="xl" size="lg" value={64} />
          <Group justify="space-between" mt="xs">
            <Text c="dimmed" size="xs">Canon, sujets et monstres</Text>
            <Text fw={700} size="xs">64%</Text>
          </Group>
        </Card>
      </SimpleGrid>
    </Stack>
  );
}

function TeachingPreview(): ReactElement {
  return (
    <Stack gap="lg">
      <Group align="flex-end" justify="space-between">
        <Box>
          <Badge color="grape" variant="light">Teaching cockpit</Badge>
          <Title mt="xs" order={1}>4CREA A</Title>
          <Text c="dimmed">24 étudiants · roster V3 · semestre 1</Text>
        </Box>
        <Button leftSection={<Mic size={17} />} variant="light">Projection classe</Button>
      </Group>

      <SimpleGrid cols={{base: 1, sm: 2, xl: 4}}>
        {[
          ['Sujets actifs', '3', 'violet'],
          ['Rendus reçus', '18 / 24', 'blue'],
          ['À valider', '4', 'yellow'],
          ['Météo', 'À calculer', 'gray'],
        ].map(([label, value, color]) => (
          <Card className="mf-card" key={label} padding="lg">
            <Badge color={color} size="xs" variant="dot">{label}</Badge>
            <Title mt="md" order={3}>{value}</Title>
          </Card>
        ))}
      </SimpleGrid>

      <Card className="mf-card" padding="xl" radius="lg">
        <Group align="flex-start" justify="space-between">
          <Box>
            <Text c="lime.4" size="xs" tt="uppercase" fw={800}>Action recommandée</Text>
            <Title mt="xs" order={3}>Relire les 4 identités incertaines</Title>
            <Text c="dimmed" mt={6}>Aucun rapprochement étudiant ne sera appliqué automatiquement.</Text>
          </Box>
          <ThemeIcon color="lime" radius="xl" size={48} variant="light">
            <ShieldCheck size={22} />
          </ThemeIcon>
        </Group>
        <Button mt="lg">Commencer la revue</Button>
      </Card>

      <SimpleGrid cols={{base: 1, md: 2}}>
        <Card className="mf-card" padding="lg">
          <Group justify="space-between">
            <Group gap="sm"><Users size={18} /><Text fw={700}>Classes</Text></Group>
            <Badge variant="light">4</Badge>
          </Group>
          <Stack gap="xs" mt="md">
            {['4CREA A · prête', '3ISCOM · ressources partielles', '3CMD · correction à reprendre'].map((label) => (
              <Paper className="mf-row" key={label} p="sm">
                <Group justify="space-between"><Text size="sm">{label}</Text><ChevronRight size={15} /></Group>
              </Paper>
            ))}
          </Stack>
        </Card>
        <Card className="mf-card" padding="lg">
          <Group justify="space-between">
            <Text fw={700}>Activité guidée</Text>
            <Badge color="lime" variant="light">Disponible</Badge>
          </Group>
          <Title mt="md" order={3}>Robot CDC IA</Title>
          <Text c="dimmed" mt="xs" size="sm">
            Aide le groupe à cadrer son outil sans produire le projet à sa place.
          </Text>
          <Button fullWidth mt="lg" variant="light">Préparer la projection</Button>
        </Card>
      </SimpleGrid>
    </Stack>
  );
}

export function MantineSpike(): ReactElement {
  const [opened, {toggle}] = useDisclosure();
  const [mode, setMode] = useState<SpikeMode>('home');

  return (
    <MantineProvider defaultColorScheme="dark" theme={theme}>
      <AppShell
        aside={{width: 286, breakpoint: 'md', collapsed: {mobile: true}}}
        header={{height: 68}}
        navbar={{width: 230, breakpoint: 'sm', collapsed: {mobile: !opened}}}
        padding="lg"
      >
        <AppShell.Header className="mf-shell-header">
          <Group h="100%" justify="space-between" px="lg">
            <Group>
              <Burger hiddenFrom="sm" onClick={toggle} opened={opened} size="sm" />
              <Box>
                <Text className="mf-brand" fw={900}>MASTERFLOW</Text>
                <Text c="dimmed" size="xs">Prototype Mantine · aucune donnée réelle</Text>
              </Box>
            </Group>
            <Group>
              <TextInput
                leftSection={<Search size={15} />}
                placeholder="Rechercher ou agir…"
                visibleFrom="md"
              />
              <Button aria-label="Notifications" px={10} variant="subtle"><Bell size={18} /></Button>
              <Avatar color="grape" radius="xl">AC</Avatar>
            </Group>
          </Group>
        </AppShell.Header>

        <AppShell.Navbar className="mf-shell-navbar" p="md">
          <AppShell.Section grow component={ScrollArea}>
            <Stack gap={4}>
              {navigation.map((item) => {
                const Icon = item.icon;
                const active = item.id === mode;
                const selectable = item.id === 'home' || item.id === 'teaching';
                return (
                  <NavLink
                    active={active}
                    disabled={!selectable}
                    key={item.id}
                    label={item.label}
                    leftSection={<Icon size={18} />}
                    onClick={() => selectable && setMode(item.id)}
                  />
                );
              })}
            </Stack>
          </AppShell.Section>
          <AppShell.Section>
            <Paper className="mf-security" p="sm">
              <Group gap="xs"><ShieldCheck size={16} /><Text fw={700} size="xs">Contexte protégé</Text></Group>
              <Text c="dimmed" mt={4} size="xs">Permissions et sources actives.</Text>
            </Paper>
          </AppShell.Section>
        </AppShell.Navbar>

        <AppShell.Main className="mf-shell-main">
          <Group justify="space-between" mb="lg">
            <SegmentedControl
              data={[
                {label: 'Home', value: 'home'},
                {label: 'Teaching', value: 'teaching'},
              ]}
              onChange={(value) => setMode(value as SpikeMode)}
              value={mode}
            />
            <Badge color="yellow" variant="outline">Spike non publiable</Badge>
          </Group>
          {mode === 'home'
            ? <HomePreview onTeaching={() => setMode('teaching')} />
            : <TeachingPreview />}
        </AppShell.Main>

        <AppShell.Aside className="mf-shell-aside" p="lg">
          <Stack h="100%" justify="space-between">
            <Stack>
              <Text c="dimmed" size="xs" tt="uppercase" fw={800}>Compagnon actif</Text>
              <Center>
                <Box className="mf-persona-orb">MF</Box>
              </Center>
              <Box ta="center">
                <Title order={3}>MasterFlex</Title>
                <Text c="dimmed" size="sm">Coaching · production</Text>
                <Badge color="lime" mt="sm" variant="dot">Disponible</Badge>
              </Box>
              <Paper className="mf-persona-bubble" p="md">
                <Text size="sm">On reprend par la prochaine action utile. Pas par les entrailles du système.</Text>
              </Paper>
            </Stack>
            <Stack>
              <TextInput leftSection={<MessageCircle size={16} />} placeholder="Parler à MasterFlex…" />
              <Button leftSection={<Mic size={16} />} variant="light">Mode vocal</Button>
            </Stack>
          </Stack>
        </AppShell.Aside>
      </AppShell>
    </MantineProvider>
  );
}
