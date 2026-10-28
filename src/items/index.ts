import type { Customer, ItemDef } from '../types';
import { lamp } from './lamp';
import { fan } from './fan';
import { radio } from './radio';
import { cassette } from './cassette';
import { clock } from './clock';

export const ITEMS: ItemDef[] = [lamp, fan, radio, cassette, clock];

export function item(id: string): ItemDef {
  const found = ITEMS.find(i => i.id === id);
  if (!found) throw new Error('unknown item ' + id);
  return found;
}

export const CUSTOMERS: Customer[] = [
  { name: '세탁소 오씨', tag: '단골', hello: '사장님 손자라며? 할아버지 솜씨 닮았나 보자고.', thanks: '역시 이 집이야. 다음에 또 올게.', angry: '이거 그대로잖아. 내일까지 다시 봐 줘.' },
  { name: '복덕방 할머니', tag: '이웃', hello: '영감이 쓰던 거라 버리지를 못하겠어.', thanks: '아이고, 영감 목소리 듣는 것 같네. 고마워.', angry: '아직 안 되는 것 같은데… 좀 더 봐 줄 수 있어?' },
  { name: '대학생 수진', tag: '처음', hello: '중고로 샀는데 상태가 이상해요.', thanks: '와, 새것 같아요! 친구들한테 여기 알려줄게요.', angry: '음… 아직 그대로인데요?' },
  { name: '정육점 박사장', tag: '단골', hello: '가게에서 하루 종일 켜 두는 거라 빨리 좀 부탁해.', thanks: '좋아, 좋아. 수고했어.', angry: '장사하는 사람한테 이러면 곤란하지.' },
  { name: '분식집 이모', tag: '이웃', hello: '애들이 쓰다가 이렇게 됐어요.', thanks: '어머, 고마워요. 떡볶이 먹으러 와요.', angry: '아직 안 되네요. 다시 맡길게요.' },
  { name: '골동품상 문선생', tag: '까다로움', hello: '원래 부품을 최대한 살려 주시오.', thanks: '음, 손이 정직하구먼.', angry: '이건 고친 게 아니지 않소.' },
  { name: '경비 아저씨', tag: '처음', hello: '야간 근무 때 꼭 필요한 거라서요.', thanks: '오늘 밤은 심심하지 않겠네요. 감사합니다.', angry: '어… 이거 아직 안 되는데요.' },
  { name: '꽃집 사장', tag: '이웃', hello: '손님이 맡겨 놓고 간 물건이에요. 대신 부탁드려요.', thanks: '깔끔하네요! 꽃 한 송이 두고 갈게요.', angry: '손님한테 뭐라고 하죠… 다시 봐 주세요.' },
  { name: '철물점 강씨', tag: '단골', hello: '나도 만져 봤는데 모르겠더라고. 자네가 봐.', thanks: '어디가 문제였어? 다음엔 나도 알아야지.', angry: '내가 봐도 아직이네.' },
  { name: '이발소 할아버지', tag: '이웃', hello: '네 할아버지랑 장기 두던 사이다. 잘 봐다오.', thanks: '허허, 그 녀석 손을 그대로 물려받았구나.', angry: '서두르지 말고 다시 보거라.' },
];
