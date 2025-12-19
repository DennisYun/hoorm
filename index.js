import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

const supabaseUrl = 'https://oabviyycktyuoouobgrb.supabase.co';
const supabaseKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hYnZpeXlja3R5dW9vdW9iZ3JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwMzkxNzgsImV4cCI6MjA4MTYxNTE3OH0.sx346gzVwD_BE1UA7_4i0jg5LbBFWD5naIhIxetYHF8';
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
const port = 5000;
const __dirname = path.resolve();

function sha10(str) {
  return crypto.createHash('sha256').update(str).digest('hex').slice(0, 10);
}

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('/wherestate', async (req, res) => {
  const gcn = req.query.gcn;
  const { data: datas } = await supabase
    .from('hoorm_students')
    .select('*')
    .eq('gcn', gcn);
  if (datas.length === 0) {
    res.send('none');
  } else {
    res.send(datas[0].where);
  }
});

app.get('/changewhere', async (req, res) => {
  const gcn = req.query.gcn;
  const check = req.query.check;
  await supabase
    .from('hoorm_students')
    .update({ where: check === 'true' ? 'dorm' : 'school' })
    .eq('gcn', gcn);
  res.send('did');
});

app.get('/checkstate', async (req, res) => {
  const gcn = req.query.gcn;
  const { data: datas } = await supabase
    .from('hoorm_students')
    .select('*')
    .eq('gcn', gcn);
  if (datas.length === 0) {
    res.send('none');
  } else {
    res.send(datas[0].check);
  }
});

app.get('/changecheck', async (req, res) => {
  const gcn = req.query.gcn;
  const check = req.query.check;
  await supabase.from('hoorm_students').update({ check }).eq('gcn', gcn);
  res.send('did');
});

app.get('/dormpeople', async (req, res) => {
  const { data: datas } = await supabase
    .from('hoorm_students')
    .select('*')
    .eq('where', 'dorm');
  res.send(datas);
});

app.get('/schoolpeople', async (req, res) => {
  const { data: datas } = await supabase
    .from('hoorm_students')
    .select('*')
    .eq('where', 'school');

  res.send(datas);
});

app.get('/allpeople', async (req, res) => {
  const { data: datas } = await supabase.from('hoorm_students').select('*');
  const csv = datas
    .map((row) => `${row.gcn}, ${row.name}, ${row.room}`)
    .join('\n');
  res.send({ csv });
});

app.get('/resetall', async (req, res) => {
  const { data: ids } = await supabase.from('hoorm_students').select('id');
  ids.forEach(async (array) => {
    await supabase
      .from('hoorm_students')
      .update({ where: 'school', check: 'false' })
      .eq('id', array.id);
  });

  res.send('done');
});

app.get('/allowchange', async (req, res) => {
  const state = req.query.state;
  await supabase
    .from('hoorm_allow')
    .update({ allowchange: state === '설문허용' ? 'yes' : 'no' })
    .eq('id', 1);
  res.send('done');
});

app.get('/currentallow', async (req, res) => {
  const { data: datas } = await supabase.from('hoorm_allow').select('*');
  res.send(datas[0].allowchange);
});

app.get('/', async (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.get('/dorm', (req, res) => {
  const code = 'hcustudentcouncilpassword';
  const pw = req.query.pw;
  if (code === pw) {
    res.sendFile(__dirname + '/dorm.html');
  } else {
    res.redirect(req.get('Referer') || '/');
  }
});

app.get('/security', (req, res) => {
  const code = 'highsecurityrequiringpassword';
  const pw = req.query.pw;
  if (code === pw) {
    res.sendFile(__dirname + '/security.html');
  } else {
    res.redirect(req.get('Referer') || '/');
  }
});

app.get('/check', async (req, res) => {
  const gcn = req.query.gcn;
  const password = req.query.password;
  const name = req.query.name;
  const { data: datas } = await supabase
    .from('hoorm_accounts')
    .select('*')
    .eq('gcn', Number(gcn))
    .eq('hash', sha10(password + 'foobarfoobar'));

  const { data: allow } = await supabase.from('hoorm_allow').select('*');

  if (allow[0].allowchange === 'yes') {
    if (datas.length === 0) {
      res.sendFile(__dirname + '/somethingwrong.html');
    } else {
      if (!name || name.trim() === '') {
        res.redirect(
          `/check?gcn=${gcn}&password=${password}&name=${datas[0].name}`
        );
      } else {
        res.sendFile(__dirname + '/check.html');
      }
    }
  } else {
    res.sendFile(__dirname + '/deadline.html');
  }
});

app.get('/teacher', (req, res) => {
  const code = 'hcuteacherpassword';
  const pw = req.query.pw;
  if (code === pw) {
    res.sendFile(__dirname + '/teacher.html');
  } else {
    res.redirect(req.get('Referer') || '/');
  }
});

app.get('/changestudent', async (req, res) => {
  const textarea = decodeURIComponent(req.query.textarea);

  const { error } = await supabase
    .from('hoorm_students')
    .delete()
    .neq('id', -1);

  const rows = textarea
    .split('\n')
    .map((line) => line.split(',').map((v) => v.trim()))
    .filter((thing) => thing.length >= 3)
    .map((thing) => ({
      gcn: Number(thing[0]),
      name: thing[1],
      room: Number(thing[2]),
      where: 'school',
      check: false,
    }));

  if (rows.length > 0) {
    const { error } = await supabase.from('hoorm_students').insert(rows);

    if (error) console.error(error);
  }

  res.send({});
});

// 형식 : gcn, name, room, where, check

app.get('/removeallaccounts', async (req, res) => {
  const { error } = await supabase
    .from('hoorm_accounts')
    .delete()
    .neq('id', -1);
  res.send({});
});

app.get('/changepassword', async (req, res) => {
  const gcn = Number(req.query.gcn);
  const password = req.query.password;

  if (!gcn) {
    return res.status(400).json({ error: 'gcn or password missing' });
  }

  if (password.trim() === '') {
    const { error } = await supabase
      .from('hoorm_accounts')
      .delete()
      .eq('gcn', gcn);
  } else {
    const { error } = await supabase
      .from('hoorm_accounts')
      .update({ hash: sha10(password + 'foobarfoobar') })
      .eq('gcn', gcn);
  }

  res.json({ success: true });
});

app.get('/signup', (req, res) => {
  res.sendFile(__dirname + '/signup.html');
});

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'chungunnetworkplus@gmail.com',
    pass: 'bywg zfww ddqx ocxh',
  },
  tls: {
    rejectUnauthorized: false,
  },
});

app.get('/sendVerifyCode', async (req, res) => {
  const address = req.query.address;
  const mailOptions = {
    from: 'chungunnetworkplus@gmail.com',
    to: address + '@hcu.hs.kr',
    subject: 'Hoorm Verification Number',
    text: `${address}@hcu.hs.kr의 인증번호 : ${sha10(address + 'foobar')}`,
  };
  await transporter.sendMail(mailOptions);
  res.send(
    JSON.stringify({
      error: 'NONE',
    })
  );
});

app.post('/dosignup', async (req, res) => {
  const { gcn, password, name, email, verifyCode } = req.body;

  /* --------------- ADD LATER --------------- */

  if (
    gcn === '' ||
    password === '' ||
    name === '' ||
    email === '' ||
    verifyCode === ''
  ) {
    res.send(
      JSON.stringify({
        error: 'INPUT ERROR',
      })
    );
    return;
  }

  /* --------------- ADD LATER --------------- */

  // 이미 존재하는 계정 여부

  const { data: datas1, error1 } = await supabase
    .from('hoorm_accounts')
    .select('*')
    .eq('gcn', gcn);

  if (error1) console.log(error1);

  if (datas1.length !== 0) {
    res.send(
      JSON.stringify({
        error: 'ALREADY EXIST',
      })
    );
    return;
  }

  // 인증번호 맞는지 여부

  if (verifyCode !== sha10(email + 'foobar')) {
    res.send(
      JSON.stringify({
        error: 'VERIFY WRONG',
      })
    );
    return;
  }

  // 동일한 메일 주소로 가입하려고 하는지 여부

  const { data: datas2, error2 } = await supabase
    .from('hoorm_accounts')
    .select('*')
    .eq('email', email);

  if (error2) console.log(error2);

  if (datas2.length !== 0) {
    res.send(
      JSON.stringify({
        error: 'USED EMAIL',
      })
    );
    return;
  }

  const { error3 } = await supabase.from('hoorm_accounts').insert({
    gcn: Number(gcn),
    hash: sha10(password + 'foobarfoobar'),
    name,
    email,
  });

  if (error3) console.log(error2);

  res.send(
    JSON.stringify({
      error: 'NONE',
    })
  );
});

app.get('/favicon', (req, res) => {
  res.sendFile(__dirname + '/image/favicon.ico');
});

app.get('/hoorm', (req, res) => {
  res.sendFile(__dirname + '/image/hoorm.png');
});

app.listen(port);

// async function insert() {
//   const things = [
//     {
//       room: 423,
//       gcn: 20312,
//       name: '어지은',
//     },
//     {
//       room: 423,
//       gcn: 20422,
//       name: '정서연',
//     },
//     {
//       room: 424,
//       gcn: 20504,
//       name: '권세연',
//     },
//     {
//       room: 424,
//       gcn: 20704,
//       name: '김지효',
//     },
//     {
//       room: 425,
//       gcn: 20605,
//       name: '김예지',
//     },
//     {
//       room: 425,
//       gcn: 20112,
//       name: '박지우',
//     },
//     {
//       room: 426,
//       gcn: 20325,
//       name: '하규린',
//     },
//     {
//       room: 426,
//       gcn: 20716,
//       name: '이지하',
//     },
//     {
//       room: 427,
//       gcn: 20124,
//       name: '최예은',
//     },
//     {
//       room: 427,
//       gcn: 20702,
//       name: '김율빈',
//     },
//     {
//       room: 428,
//       gcn: 20706,
//       name: '박서영',
//     },
//     {
//       room: 428,
//       gcn: 20116,
//       name: '심지은',
//     },
//     {
//       room: 429,
//       gcn: 20118,
//       name: '이예빈',
//     },
//     {
//       room: 429,
//       gcn: 20118,
//       name: '이예빈',
//     },
//     {
//       room: 430,
//       gcn: 20316,
//       name: '이하윤',
//     },
//     {
//       room: 430,
//       gcn: 20719,
//       name: '장예령',
//     },
//     {
//       room: 431,
//       gcn: 20426,
//       name: '허윤아',
//     },
//     {
//       room: 431,
//       gcn: 20122,
//       name: '정예원',
//     },
//     {
//       room: 432,
//       gcn: 20401,
//       name: '감가원',
//     },
//     {
//       room: 432,
//       gcn: 20512,
//       name: '서지후',
//     },
//     {
//       room: 433,
//       gcn: 20524,
//       name: '조해원',
//     },
//     {
//       room: 433,
//       gcn: 20311,
//       name: '손해인',
//     },
//     {
//       room: 434,
//       gcn: 20503,
//       name: '구다연',
//     },
//     {
//       room: 434,
//       gcn: 20616,
//       name: '이경은',
//     },
//     {
//       room: 435,
//       gcn: 20613,
//       name: '백윤지',
//     },
//     {
//       room: 435,
//       gcn: 20724,
//       name: '진서윤',
//     },
//     {
//       room: 436,
//       gcn: 20721,
//       name: '정정아',
//     },
//     {
//       room: 436,
//       gcn: 20101,
//       name: '강지효',
//     },
//     {
//       room: 437,
//       gcn: 20411,
//       name: '박세민',
//     },
//     {
//       room: 437,
//       gcn: 20505,
//       name: '권소연',
//     },
//     {
//       room: 438,
//       gcn: 20612,
//       name: '배찬희',
//     },
//     {
//       room: 438,
//       gcn: 20119,
//       name: '이유림',
//     },
//     {
//       room: 439,
//       gcn: 20205,
//       name: '김하린',
//     },
//     {
//       room: 439,
//       gcn: 20515,
//       name: '양지아',
//     },
//     {
//       room: 440,
//       gcn: 20415,
//       name: '유연화',
//     },
//     {
//       room: 440,
//       gcn: 20507,
//       name: '김나령',
//     },
//     {
//       room: 441,
//       gcn: 20519,
//       name: '이영서',
//     },
//     {
//       room: 441,
//       gcn: 20520,
//       name: '이예지',
//     },
//     {
//       room: 520,
//       gcn: 20313,
//       name: '윤이나',
//     },
//     {
//       room: 520,
//       gcn: 20418,
//       name: '이서랑',
//     },
//     {
//       room: 521,
//       gcn: 20526,
//       name: '황현정',
//     },
//     {
//       room: 521,
//       gcn: 20614,
//       name: '손유진',
//     },
//     {
//       room: 522,
//       gcn: 20703,
//       name: '김지연',
//     },
//     {
//       room: 522,
//       gcn: 20423,
//       name: '정채원',
//     },
//     {
//       room: 523,
//       gcn: 20617,
//       name: '이현서',
//     },
//     {
//       room: 523,
//       gcn: 20603,
//       name: '김서하',
//     },
//     {
//       room: 524,
//       gcn: 20218,
//       name: '이서연',
//     },
//     {
//       room: 524,
//       gcn: 20220,
//       name: '장유희',
//     },
//     {
//       room: 525,
//       gcn: 20208,
//       name: '성다연',
//     },
//     {
//       room: 525,
//       gcn: 20110,
//       name: '김채연',
//     },
//     {
//       room: 526,
//       gcn: 20308,
//       name: '박성진',
//     },
//     {
//       room: 526,
//       gcn: 20419,
//       name: '이윤경',
//     },
//     {
//       room: 527,
//       gcn: 20412,
//       name: '박수연',
//     },
//     {
//       room: 527,
//       gcn: 20115,
//       name: '서현아',
//     },
//     {
//       room: 528,
//       gcn: 20214,
//       name: '유지윤',
//     },
//     {
//       room: 528,
//       gcn: 20626,
//       name: '허정원',
//     },
//     {
//       room: 529,
//       gcn: 20403,
//       name: '권하은',
//     },
//     {
//       room: 529,
//       gcn: 20718,
//       name: '임주하',
//     },
//     {
//       room: 530,
//       gcn: 20623,
//       name: '최유나',
//     },
//     {
//       room: 530,
//       gcn: 20213,
//       name: '유수빈',
//     },
//     {
//       room: 531,
//       gcn: 20315,
//       name: '이예윤',
//     },
//     {
//       room: 531,
//       gcn: 20525,
//       name: '최수빈',
//     },
//     {
//       room: 532,
//       gcn: 20725,
//       name: '천효원',
//     },
//     {
//       room: 532,
//       gcn: 20715,
//       name: '이지유',
//     },
//     {
//       room: 533,
//       gcn: 20209,
//       name: '송주은',
//     },
//     {
//       room: 533,
//       gcn: 20523,
//       name: '정수빈',
//     },
//     {
//       room: 534,
//       gcn: 20601,
//       name: '고연우',
//     },
//     {
//       room: 534,
//       gcn: 20321,
//       name: '정유림',
//     },
//     {
//       room: 535,
//       gcn: 20608,
//       name: '김채현',
//     },
//     {
//       room: 535,
//       gcn: 20710,
//       name: '원지안',
//     },
//     {
//       room: 536,
//       gcn: 20211,
//       name: '양수영',
//     },
//     {
//       room: 536,
//       gcn: 20320,
//       name: '정수인',
//     },
//     {
//       room: 537,
//       gcn: 20506,
//       name: '김규희',
//     },
//     {
//       room: 537,
//       gcn: 20302,
//       name: '강윤아',
//     },
//     {
//       room: 538,
//       gcn: 20215,
//       name: '윤예서',
//     },
//     {
//       room: 538,
//       gcn: 20113,
//       name: '배소윤',
//     },
//     {
//       room: 622,
//       gcn: 20108,
//       name: '김유진',
//     },
//     {
//       room: 622,
//       gcn: 20126,
//       name: '한선주',
//     },
//     {
//       room: 623,
//       gcn: 20713,
//       name: '이유정',
//     },
//     {
//       room: 623,
//       gcn: 20224,
//       name: '주현서',
//     },
//     {
//       room: 624,
//       gcn: 20318,
//       name: '장진이',
//     },
//     {
//       room: 624,
//       gcn: 20201,
//       name: '권효주',
//     },
//     {
//       room: 625,
//       gcn: 20607,
//       name: '김채영',
//     },
//     {
//       room: 625,
//       gcn: 20206,
//       name: '박서현',
//     },
//     {
//       room: 626,
//       gcn: 20206,
//       name: '박서현',
//     },
//     {
//       room: 626,
//       gcn: 20123,
//       name: '조민정',
//     },
//     {
//       room: 627,
//       gcn: 20420,
//       name: '이윤서',
//     },
//     {
//       room: 627,
//       gcn: 20324,
//       name: '최서영',
//     },
//     {
//       room: 628,
//       gcn: 20408,
//       name: '김지민',
//     },
//     {
//       room: 628,
//       gcn: 20207,
//       name: '배서현',
//     },
//     {
//       room: 629,
//       gcn: 20309,
//       name: '배다빈',
//     },
//     {
//       room: 629,
//       gcn: 20421,
//       name: '이지현',
//     },
//     {
//       room: 630,
//       gcn: 20611,
//       name: '박서희',
//     },
//     {
//       room: 630,
//       gcn: 20310,
//       name: '변윤서',
//     },
//     {
//       room: 631,
//       gcn: 20402,
//       name: '권세은',
//     },
//     {
//       room: 631,
//       gcn: 20709,
//       name: '심은서',
//     },
//   ];
//   for (let thing of things) {
//     await supabase
//       .from('hoorm_students')
//       .insert({ ...thing, where: 'school', check: 'false' });
//   }
// }

// insert();
